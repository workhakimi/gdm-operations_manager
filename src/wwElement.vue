<template>
    <div class="ops-manager" :style="{ '--c-batch-sep': content.colorBatchSeparator, '--c-th-bg': content.colorTableHeaderBg, '--c-confirm-bg': content.colorConfirmBtnBg }">
        <div v-if="confirmAction" class="confirm-dismiss-overlay" @click="confirmAction = null" />
        <!-- ═══ EMPTY STATE ═══ -->
        <div v-if="!currentHeader" class="empty-state">
            <p class="empty-text">Select an order plan to view operations.</p>
        </div>

        <!-- ═══ MAIN CONTENT ═══ -->
        <div v-else class="ops-content">
            <!-- Waiting overlay (blocks all interaction) -->
            <div v-if="pendingAction" class="action-waiting-overlay">
                <div class="action-waiting-spinner"></div>
                <span class="action-waiting-text">Processing...</span>
            </div>

            <!-- Header Bar -->
            <div class="header-bar" :style="{ background: content.colorHeaderBarBg }">
                <span class="opid-badge">{{ currentHeader.opid }}</span>
                <span class="header-title">{{ currentHeader.title }}</span>
                <span class="header-status" :class="'status--' + (currentHeader.status || '').toLowerCase()">{{ currentHeader.status || 'Draft' }}</span>
            </div>

            <!-- Section: Order Metadata (always read-only) -->
            <section class="section">
                <h3 class="section-heading">Order Metadata</h3>
                <table class="meta-table">
                    <tbody>
                        <tr><td class="meta-label">Title<span v-if="!currentHeader.title" class="req">*</span></td><td>{{ currentHeader.title || '-' }}</td></tr>
                        <tr><td class="meta-label">Quote Ref<span v-if="!currentHeader.quoteref" class="req">*</span></td><td>{{ currentHeader.quoteref || '-' }}</td></tr>
                        <tr><td class="meta-label">Invoice Ref<span v-if="!currentHeader.invoiceref" class="req">*</span></td><td>{{ currentHeader.invoiceref || '-' }}</td></tr>
                        <tr><td class="meta-label">PIC (BDA)<span v-if="!currentHeader.pic_bda" class="req">*</span></td><td>{{ getTeammateName(currentHeader.pic_bda) || 'Not assigned' }}</td></tr>
                        <tr><td class="meta-label">PIC (OPS)<span v-if="!currentHeader.pic_ops" class="req">*</span></td><td>{{ getTeammateName(currentHeader.pic_ops) || 'Not assigned' }}</td></tr>
                        <tr><td class="meta-label">Status</td><td>{{ currentHeader.status || 'Draft' }}</td></tr>
                        <tr><td class="meta-label">Created</td><td>{{ formatDate(currentHeader.created_at) }}</td></tr>
                        <tr v-if="currentHeader.submitted_at"><td class="meta-label">Submitted</td><td>{{ formatDate(currentHeader.submitted_at) }}</td></tr>
                    </tbody>
                </table>
            </section>

            <!-- Section: Attached Bookings -->
            <section class="section">
                <h3 class="section-heading">Attached Bookings <span class="count-badge">{{ attachedBookings.length }}</span><span v-if="attachedBookings.length === 0" class="req">*</span></h3>
                <div v-if="attachedBookings.length === 0 && !opEditMode" class="empty-section">No bookings attached to this order plan.</div>

                <!-- One card per booking -->
                <div v-for="booking in attachedBookings" :key="booking.id" class="pipe-card">
                    <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                        <div class="pipe-card-header-main">
                            <span class="pipe-card-title">{{ booking.bookingnumber }}</span>
                            <span class="status-pill" :class="'pill--' + (booking.status || 'booked').toLowerCase().replace(/\s+/g, '-')">{{ booking.status || 'Booked' }}</span>
                        </div>
                        <div class="pipe-card-meta-row">
                            <span class="pipe-card-meta">{{ booking.bookingtitle || '-' }}</span>
                            <span v-if="booking._picName" class="pipe-card-contact">{{ booking._picName }}</span>
                            <span class="pipe-card-meta" style="margin-left:auto">{{ booking.unique_skus || 0 }} SKUs · {{ booking.total_quantity || 0 }} pcs</span>
                        </div>
                    </div>
                    <div class="table-scroll">
                        <table class="pipe-table">
                            <colgroup>
                                <col style="width:32px" />
                                <col style="width:120px" />
                                <col />
                                <col style="width:100px" />
                                <col style="width:60px" />
                                <col style="width:90px" />
                                <col style="width:50px" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>SKU</th>
                                    <th>Model</th>
                                    <th>Color</th>
                                    <th class="col-left">Qty</th>
                                    <th>Status</th>
                                    <th class="col-left">Bal Ref</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in booking._items" :key="item.id">
                                    <td class="cell-img"><img v-if="item._inv?.imagelink" :src="item._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                    <td class="cell-mono">{{ item.sku }}</td>
                                    <td>{{ item._inv?.model || 'Unknown' }}</td>
                                    <td>{{ item._inv?.color || '-' }}</td>
                                    <td class="col-left">{{ item.quantity }}</td>
                                    <td>
                                        <select class="status-select" :class="'ss--' + statusKey(item.status)" :value="item.status || 'Booked'" @change="handleStatusChange(item.id, $event.target.value)">
                                            <option value="Booked">Booked</option>
                                            <option value="Issue Raised">Issue Raised</option>
                                            <option value="Processing">Processing</option>
                                            <option value="Delivered to Production">Delivered to Production</option>
                                            <option value="Delivered to Client">Delivered to Client</option>
                                            <option value="Released">Released</option>
                                        </select>
                                    </td>
                                    <td class="col-left cell-mono" :class="{ 'cell-neg': (item.balanceref ?? 0) < 0 }">{{ item.balanceref ?? '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <details v-if="booking._releasedItems && booking._releasedItems.length > 0" class="released-details">
                        <summary class="released-summary">Previously Released ({{ booking._releasedItems.length }})</summary>
                        <table class="booking-table released-table">
                            <tbody>
                                <tr v-for="item in booking._releasedItems" :key="item.id">
                                    <td class="cell-img"><img v-if="item._inv?.imagelink" :src="item._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                    <td class="cell-mono">{{ item.sku }}</td>
                                    <td>{{ item._inv?.model || 'Unknown' }}</td>
                                    <td>{{ item._inv?.color || '-' }}</td>
                                    <td class="col-left">{{ item.quantity }}</td>
                                    <td><span class="status-tag st--released">Released</span></td>
                                    <td class="col-left cell-mono">{{ item.balanceref ?? '-' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </details>
                </div>
            </section>

            <!-- Toggle Bar -->
            <div class="toggle-bar">
                <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': activeView === 'orderplan' }" @click="activeView = 'orderplan'">Order Plan View</button>
                <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': activeView === 'pipeline' }" @click="activeView = 'pipeline'; cancelEditMode()">Pipeline Manager</button>
            </div>

            <!-- ═══ ORDER PLAN VIEW (INTERACTIVE EDITOR) ═══ -->
            <div v-if="activeView === 'orderplan'" class="view-content">
                <!-- Action status -->
                <div v-if="actionFailed" class="action-failed-bar" @click="handleRetry">
                    <span class="failed-text">{{ actionFailedLabel }} failed.</span>
                    <span class="failed-retry">Click to retry</span>
                </div>
                <div v-if="actionSuccess" class="action-success-bar">
                    <span class="success-text">Action completed successfully.</span>
                </div>
                <!-- Edit bar -->
                <div v-if="isDeleted" class="edit-bar">
                    <span class="submitted-notice">This order plan has been deleted. Read-only.</span>
                </div>
                <div v-else class="edit-bar" @click.self="confirmAction = null">
                    <template v-if="!opEditMode">
                        <template v-if="(currentHeader.status || '').toLowerCase() !== 'submitted'">
                            <button type="button" class="btn-action btn-action--primary" @click="enterEditMode">Edit Order Plan</button>
                            <button v-if="canSubmit" type="button" class="btn-action" :class="confirmAction === 'submit' ? 'btn-action--confirm' : 'btn-action--submit'" @click="confirmOrDo('submit', handleSubmitOrderPlan)">{{ confirmAction === 'submit' ? 'Confirm Submit?' : 'Submit' }}</button>
                            <span v-else class="submitted-notice">Please complete the order plan to submit for processing.</span>
                        </template>
                        <template v-else>
                            <button type="button" class="btn-action btn-action--primary" @click="enterEditMode">Edit Order Plan</button>
                            <button type="button" class="btn-action" :class="confirmAction === 'unsubmit' ? 'btn-action--confirm' : 'btn-action--dark'" @click="confirmOrDo('unsubmit', handleUnsubmitOrderPlan)">{{ confirmAction === 'unsubmit' ? 'Confirm Unsubmit?' : 'Unsubmit' }}</button>
                        </template>
                    </template>
                    <template v-else>
                        <button type="button" class="btn-action btn-action--muted" @click="cancelEditMode">Cancel</button>
                        <button v-if="canSaveForm" type="button" class="btn-action" :class="confirmAction === 'update' ? 'btn-action--confirm' : 'btn-action--primary'" @click="confirmOrDo('update', handleSaveOrderPlan)">{{ confirmAction === 'update' ? 'Confirm Update?' : 'Update' }}</button>
                        <span v-else class="submitted-notice">Fill in all required fields to update.</span>
                        <button type="button" class="btn-action" :class="confirmAction === 'delete' ? 'btn-action--confirm' : 'btn-action--danger'" @click="confirmOrDo('delete', handleDeleteOrderPlan)">{{ confirmAction === 'delete' ? 'Confirm Delete?' : 'Delete' }}</button>
                    </template>
                </div>

                <!-- BD Number warning -->
                <div v-if="opEditMode && hasBdNumbers" class="bd-warn-banner">
                    <strong>Warning:</strong> Some batches have BD numbers assigned. Updating this order plan will require re-setting BD numbers in the Pipeline Manager.
                </div>

                <!-- Editable Metadata (shown in edit mode) -->
                <section v-if="opEditMode" class="section">
                    <h3 class="section-heading">Edit Metadata</h3>
                    <table class="meta-table">
                        <tbody>
                            <tr><td class="meta-label">Title<span v-if="!form.title" class="req">*</span></td><td><input type="text" class="meta-input" v-model="form.title" placeholder="Order title" /></td></tr>
                            <tr><td class="meta-label">Quote Ref<span v-if="!form.quoteref" class="req">*</span></td><td><div class="prefixed-input"><span class="prefixed-input-label">QU-</span><input type="text" class="meta-input" v-model="form.quoteref" placeholder="123456" /></div></td></tr>
                            <tr><td class="meta-label">Invoice Ref<span v-if="!form.invoiceref" class="req">*</span></td><td><div class="prefixed-input"><select class="prefixed-input-select" v-model="form.invoicePrefix"><option value="LMSB">LMSB-</option><option value="STPL">STPL-</option></select><input type="text" class="meta-input" v-model="form.invoiceref" placeholder="123456" /></div></td></tr>
                            <tr><td class="meta-label">PIC (BDA)<span v-if="!form.pic_bda" class="req">*</span></td><td>
                                <select class="meta-select" v-model="form.pic_bda">
                                    <option value="">Not assigned</option>
                                    <option v-for="t in resolvedTeammates" :key="t.id" :value="t.id">{{ t.name }}</option>
                                </select>
                            </td></tr>
                            <tr><td class="meta-label">PIC (OPS)<span v-if="!form.pic_ops" class="req">*</span></td><td>
                                <select class="meta-select" v-model="form.pic_ops">
                                    <option value="">Not assigned</option>
                                    <option v-for="t in resolvedTeammates" :key="t.id" :value="t.id">{{ t.name }}</option>
                                </select>
                            </td></tr>
                        </tbody>
                    </table>
                </section>

                <!-- Delivery Cards -->
                <section class="section">
                    <h3 class="section-heading">
                        Delivery Locations <span class="count-badge">{{ opEditMode ? formDeliveries.length : currentDeliveries.length }}</span><span v-if="!opEditMode && currentDeliveries.length === 0" class="req">*</span>
                        <button v-if="opEditMode" type="button" class="btn-add" @click="addFormDelivery">+ Add Location</button>
                    </h3>

                    <!-- READ-ONLY MODE -->
                    <template v-if="!opEditMode">
                        <div v-if="currentDeliveries.length === 0" class="empty-section">No deliveries configured.</div>
                        <div v-for="del in currentDeliveries" :key="del.id" class="pipe-card">
                            <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                                <div class="pipe-card-header-main">
                                    <span class="pipe-card-title">{{ del.label || 'Unnamed Location' }}<span v-if="!del.label" class="req">*</span></span>
                                    <span v-if="del.deliverytype" class="pipe-dtype-tag">{{ del.deliverytype }}</span>
                                </div>
                                <div class="pipe-card-meta"><span v-if="del.address">{{ del.address }}</span><span v-else class="cell-muted">No address<span class="req">*</span></span></div>
                                <div class="pipe-card-meta-row">
                                    <span v-if="del.deadline" class="pipe-card-deadline">Delivery by: {{ formatDate(del.deadline) }}</span><span v-else class="cell-muted">No deadline<span class="req">*</span></span>
                                    <span v-if="del.pic_name" class="pipe-card-contact">{{ del.pic_name }}<span v-if="del.pic_phone"> · {{ del.pic_phone }}</span><span v-else><span class="req">*</span></span></span><span v-else class="cell-muted">No contact<span class="req">*</span></span>
                                </div>
                                <div v-if="del.remarks" class="pipe-card-remarks">{{ del.remarks }}</div>
                            </div>
                            <div v-if="linesForDelivery(del.id).length > 0" class="table-scroll">
                                <table class="pipe-table">
                                    <colgroup>
                                        <col style="width:32px" /><col style="width:110px" /><col style="width:14%" /><col style="width:70px" /><col style="width:55px" /><col style="width:45px" /><col style="width:110px" /><col style="width:80px" /><col style="width:85px" /><col style="width:60px" />
                                    </colgroup>
                                    <thead><tr><th></th><th>SKU</th><th>Model</th><th>Color</th><th class="col-left">Qty</th><th>Split</th><th>Customization</th><th>Labor</th><th>Status</th><th>Mockup</th></tr></thead>
                                    <tbody>
                                        <tr v-for="line in linesForDelivery(del.id)" :key="line.id">
                                            <td class="cell-img"><img v-if="line._inv?.imagelink" :src="line._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                            <td class="cell-mono">{{ line._bookingItem?.sku || '-' }}</td>
                                            <td>{{ line._inv?.model || 'Unknown' }}</td>
                                            <td>{{ line._inv?.color || '-' }}</td>
                                            <td class="col-left cell-mono">{{ line.quantity_assigned }}/{{ line._bookingItem?.quantity || '?' }}<span v-if="!line.quantity_assigned || line.quantity_assigned <= 0" class="req">*</span></td>
                                            <td><span v-if="isSplit(line)" class="split-tag">Split</span><span v-else class="cell-muted">-</span></td>
                                            <td>{{ custDisplay(line.customization) }}<span v-if="!line.customization" class="req">*</span></td>
                                            <td>{{ laborDisplay(line.labor) || '-' }}<span v-if="!line.labor" class="req">*</span></td>
                                            <td>
                                                <select class="status-select" :class="'ss--' + statusKey(line._bookingItem?.status)" :value="line._bookingItem?.status || 'Booked'" @change="handleStatusChange(line.bookingitems_headerid, $event.target.value)">
                                                    <option value="Booked">Booked</option><option value="Issue Raised">Issue Raised</option><option value="Processing">Processing</option><option value="Delivered">Delivered</option>
                                                </select>
                                            </td>
                                            <td><a v-if="line.mockup_link" :href="line.mockup_link" target="_blank" class="link">Mockup</a><span v-else class="cell-muted">-</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div v-else class="empty-section empty-section--sm">No items allocated to this delivery.</div>
                        </div>
                        <div v-if="unassignedLines.length > 0" class="pipe-card pipe-card--warn">
                            <div class="pipe-card-header" style="background:#fef2f2; color:#991b1b;">
                                <div class="pipe-card-header-main">
                                    <span class="pipe-card-title">Unassigned Items<span class="req">*</span></span>
                                    <span class="count-badge">{{ unassignedLines.length }}</span>
                                </div>
                                <div class="pipe-card-meta">These items need a delivery destination assigned.</div>
                            </div>
                            <div class="table-scroll">
                                <table class="pipe-table">
                                    <colgroup>
                                        <col style="width:32px" /><col style="width:110px" /><col style="width:14%" /><col style="width:70px" /><col style="width:55px" /><col style="width:110px" /><col style="width:80px" /><col style="width:85px" />
                                    </colgroup>
                                    <thead><tr><th></th><th>SKU</th><th>Model</th><th>Color</th><th class="col-left">Qty</th><th>Customization</th><th>Labor</th><th>Status</th></tr></thead>
                                    <tbody>
                                        <tr v-for="line in unassignedLines" :key="line.id">
                                            <td class="cell-img"><img v-if="line._inv?.imagelink" :src="line._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                            <td class="cell-mono">{{ line._bookingItem?.sku || '-' }}</td>
                                            <td>{{ line._inv?.model || 'Unknown' }}</td>
                                            <td>{{ line._inv?.color || '-' }}</td>
                                            <td class="col-left cell-mono">{{ line.quantity_assigned }}/{{ line._bookingItem?.quantity || '?' }}</td>
                                            <td>{{ custDisplay(line.customization) }}<span v-if="!line.customization" class="req">*</span></td>
                                            <td>{{ laborDisplay(line.labor) || '-' }}<span v-if="!line.labor" class="req">*</span></td>
                                            <td><span class="status-tag" :class="'st--' + statusKey(line._bookingItem?.status)">{{ line._bookingItem?.status || 'Booked' }}</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </template>

                    <!-- EDIT MODE: Delivery Cards -->
                    <template v-if="opEditMode">
                        <div v-if="formDeliveries.length === 0" class="empty-section">No deliveries. Click "+ Add Location" above.</div>
                        <div v-for="(fd, fdIdx) in formDeliveries" :key="fd._uid" class="pipe-card">
                            <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                                <div class="pipe-card-header-main">
                                    <input type="text" class="edit-input edit-input--title" v-model="fd.label" placeholder="Location name" /><span v-if="!fd.label" class="req">*</span>
                                    <select class="edit-select edit-select--sm" v-model="fd.deliverytype">
                                        <option value="Klang Valley">Klang Valley</option>
                                        <option value="West Malaysia">West Malaysia</option>
                                        <option value="East Malaysia">East Malaysia</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="Self Pickup">Self Pickup</option>
                                    </select>
                                    <button v-if="formDeliveries.length > 1" type="button" class="btn-icon btn-icon--danger" @click="removeFormDelivery(fdIdx)" title="Remove">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                </div>
                                <div class="edit-grid-3">
                                    <div class="edit-field"><label class="edit-label">Deadline<span v-if="!fd.deadline" class="req">*</span></label><input type="datetime-local" class="edit-input" v-model="fd.deadline" /></div>
                                    <div class="edit-field"><label class="edit-label">Contact Name<span v-if="!fd.pic_name" class="req">*</span></label><input type="text" class="edit-input" v-model="fd.pic_name" placeholder="Contact name" /></div>
                                    <div class="edit-field"><label class="edit-label">Phone<span v-if="!fd.pic_phone" class="req">*</span></label><input type="text" class="edit-input" v-model="fd.pic_phone" placeholder="Phone" /></div>
                                </div>
                                <div class="edit-field" style="margin-top:6px"><label class="edit-label">Address<span v-if="!fd.address" class="req">*</span></label><textarea class="edit-textarea" v-model="fd.address" placeholder="Delivery address" rows="2" style="margin-top:0"></textarea></div>
                                <div class="edit-field" style="margin-top:4px"><label class="edit-label">Remarks</label><input type="text" class="edit-input" v-model="fd.remarks" placeholder="Remarks (optional)" style="width:100%" /></div>
                            </div>
                        </div>
                    </template>
                </section>

                <!-- EDIT MODE: Allocations per Booking -->
                <section v-if="opEditMode" class="section">
                    <h3 class="section-heading">
                        Allocations
                        <span class="count-badge">{{ formAttachedBookingIds.length }} bookings</span>
                        <div class="connect-booking-wrap">
                            <button type="button" class="btn-add" @click="showBookingDropdown = !showBookingDropdown">+ Connect Booking</button>
                            <div v-if="showBookingDropdown" class="booking-dropdown">
                                <div class="booking-dropdown-search"><input type="text" class="edit-input" v-model="bookingSearch" placeholder="Search bookings..." /></div>
                                <div class="booking-dropdown-list">
                                    <div v-for="bh in filteredBookingsForConnect" :key="bh.id" class="bk-option" :class="{ 'bk-option--attached': isBookingAttached(bh.id) }" @click="!isBookingAttached(bh.id) && attachFormBooking(bh)">
                                        <span class="cell-mono">{{ bh.bookingnumber }}</span>
                                        <span>{{ bh.bookingtitle || '' }}</span>
                                        <span v-if="isBookingAttached(bh.id)" class="bk-attached-label">Attached</span>
                                    </div>
                                    <div v-if="filteredBookingsForConnect.length === 0" class="cell-muted" style="padding:8px;text-align:center">No bookings found</div>
                                </div>
                            </div>
                        </div>
                    </h3>

                    <div v-if="formAttachedBookingIds.length === 0" class="empty-section">No bookings connected. Use "+ Connect Booking" to add one.</div>

                    <div v-for="(fabId, fabIdx) in formAttachedBookingIds" :key="fabId" class="pipe-card">
                        <div class="alloc-booking-header">
                            <span class="cell-mono" style="font-weight:700">{{ bookingHeaderLookup[fabId]?.bookingnumber || fabId }}</span>
                            <span>{{ bookingHeaderLookup[fabId]?.bookingtitle || '' }}</span>
                            <button type="button" class="btn-icon btn-icon--danger" style="margin-left:auto" @click="detachFormBooking(fabIdx)" title="Detach">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <!-- Per SKU in booking -->
                        <div v-for="item in itemsForBooking(fabId)" :key="item.id" class="alloc-sku-block">
                            <div class="alloc-sku-header">
                                <img v-if="item._inv?.imagelink" :src="item._inv.imagelink" class="thumb-sm" />
                                <div>
                                    <div style="font-weight:600">{{ item._inv?.model || 'Unknown' }}</div>
                                    <div class="cell-muted" style="font-size:10px">{{ item._inv?.color || '-' }} · {{ item.sku }}</div>
                                </div>
                                <span class="alloc-summary" :class="allocSummaryClass(fabId, item.id, item.quantity)">{{ allocTotal(fabId, item.id) }}/{{ item.quantity }}</span>
                            </div>

                            <!-- Allocation rows -->
                            <div class="table-scroll">
                                <table class="pipe-table alloc-table">
                                    <colgroup>
                                        <col style="width:75px" /><col style="width:26%" /><col style="width:20%" /><col style="width:18%" /><col /><col style="width:60px" />
                                    </colgroup>
                                    <thead><tr><th>Qty</th><th>Destination</th><th>Customization</th><th>Labor</th><th>Mockup</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <tr v-for="(alloc, aIdx) in getAllocs(fabId, item.id)" :key="alloc._uid" :class="{ 'alloc-row--split': getAllocs(fabId, item.id).length > 1 }">
                                            <td><input type="number" class="edit-input edit-input--qty" :value="alloc.quantity_assigned" @input="updateAllocQty(fabId, item.id, aIdx, $event)" min="0" /><span v-if="!alloc.quantity_assigned || alloc.quantity_assigned <= 0" class="req">*</span></td>
                                            <td>
                                                <select class="edit-select" :value="alloc.deliveries_uid" @change="updateAllocField(fabId, item.id, aIdx, 'deliveries_uid', $event.target.value)">
                                                    <option value="">Select delivery...</option>
                                                    <option v-for="fd in formDeliveries" :key="fd._uid" :value="fd._uid">{{ fd.label || 'Unnamed' }} ({{ fd.deliverytype || '?' }})</option>
                                                </select><span v-if="!alloc.deliveries_uid" class="req">*</span>
                                            </td>
                                            <td>
                                                <select class="edit-select" :value="alloc.customization" @change="updateAllocField(fabId, item.id, aIdx, 'customization', $event.target.value)">
                                                    <option value="" disabled>Select...</option>
                                                    <option v-for="opt in custOptions" :key="opt.customization_sku" :value="opt.customization_sku">{{ opt.subtype }}</option>
                                                </select><span v-if="!alloc.customization" class="req">*</span>
                                            </td>
                                            <td>
                                                <select class="edit-select" :value="alloc.labor" @change="updateAllocField(fabId, item.id, aIdx, 'labor', $event.target.value)">
                                                    <option value="" disabled>Select...</option>
                                                    <option v-for="opt in labOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                                </select><span v-if="!alloc.labor" class="req">*</span>
                                            </td>
                                            <td>
                                                <input v-if="alloc.customization && alloc.customization !== 'NONE'" type="text" class="edit-input" :value="alloc.mockup_link" @input="updateAllocField(fabId, item.id, aIdx, 'mockup_link', $event.target.value)" placeholder="URL" />
                                                <span v-else class="cell-muted">-</span>
                                            </td>
                                            <td class="alloc-actions">
                                                <button type="button" class="btn-icon" :class="{ 'btn-icon--disabled': alloc.quantity_assigned < 2 }" :disabled="alloc.quantity_assigned < 2" @click="handleSplitAlloc(fabId, item.id, aIdx)" title="Split">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                </button>
                                                <button v-if="getAllocs(fabId, item.id).length > 1" type="button" class="btn-icon btn-icon--danger" @click="removeAllocRow(fabId, item.id, aIdx)" title="Remove split">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <!-- ═══ PIPELINE MANAGER VIEW ═══ -->
            <div v-if="activeView === 'pipeline'" class="view-content">
                <!-- Action status -->
                <div v-if="actionFailed" class="action-failed-bar" @click="handleRetry">
                    <span class="failed-text">{{ actionFailedLabel }} failed.</span>
                    <span class="failed-retry">Click to retry</span>
                </div>
                <div v-if="actionSuccess" class="action-success-bar">
                    <span class="success-text">Action completed successfully.</span>
                </div>
                <div v-if="isDeleted" class="edit-bar">
                    <span class="submitted-notice">This order plan has been deleted. Read-only.</span>
                </div>
                <div v-else-if="(currentHeader.status || '').toLowerCase() === 'submitted'" class="edit-bar" @click.self="confirmAction = null">
                    <button type="button" class="btn-action" :class="confirmAction === 'unsubmit' ? 'btn-action--confirm' : 'btn-action--dark'" @click="confirmOrDo('unsubmit', handleUnsubmitOrderPlan)">{{ confirmAction === 'unsubmit' ? 'Confirm Unsubmit?' : 'Unsubmit to Draft' }}</button>
                </div>
                <section class="section">
                    <h3 class="section-heading">Order Pipeline <span class="count-badge">{{ pipelineBatches.length }} batches</span></h3>
                    <div v-if="pipelineBatches.length === 0" class="empty-section">No order plan lines found. Create allocations in the Order Plan Manager first.</div>

                    <div v-for="group in pipelineDeliveryGroups" :key="group.deliveries_headerid" class="pipe-card">
                        <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                            <div class="pipe-card-header-main">
                                <span class="pipe-card-title">{{ group.deliveryLabel }}</span>
                                <span v-if="group.delivery?.deliverytype" class="pipe-dtype-tag">{{ group.delivery.deliverytype }}</span>
                            </div>
                            <div v-if="group.delivery?.address" class="pipe-card-meta">{{ group.delivery.address }}</div>
                            <div class="pipe-card-meta-row">
                                <span v-if="group.delivery?.deadline" class="pipe-card-deadline">Delivery by: {{ formatDate(group.delivery.deadline) }}</span>
                                <span v-if="group.delivery?.pic_name" class="pipe-card-contact">{{ group.delivery.pic_name }}<span v-if="group.delivery?.pic_phone"> · {{ group.delivery.pic_phone }}</span></span>
                            </div>
                            <div v-if="group.delivery?.remarks" class="pipe-card-remarks">{{ group.delivery.remarks }}</div>
                        </div>

                        <div class="table-scroll">
                            <table class="pipe-table">
                                <colgroup>
                                    <col style="width:32px" /><col style="width:110px" /><col style="width:12%" /><col style="width:100px" /><col style="width:85px" /><col style="width:80px" /><col style="width:100px" /><col style="width:80px" /><col style="width:120px" />
                                </colgroup>
                                <thead><tr><th></th><th>SKU</th><th>Model</th><th>Color</th><th>Qty</th><th>Status</th><th>BD#</th><th>Customization</th><th>DO Folder</th></tr></thead>
                                <tbody>
                                    <template v-for="batch in group.batches" :key="batch.key">
                                        <tr class="batch-header-row"><td colspan="9"><span class="batch-type-tag">{{ batch.customizationType }}</span></td></tr>
                                        <tr v-for="(item, itemIdx) in batch.items" :key="item.lineId" :class="{ 'batch-first': itemIdx === 0 }">
                                            <td class="cell-img"><img v-if="item.imagelink" :src="item.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                            <td class="cell-mono">{{ item.sku }}</td>
                                            <td>{{ item.model }}</td>
                                            <td>{{ item.color }}</td>
                                            <td class="cell-mono" style="white-space:nowrap">{{ item.qtyDisplay }}</td>
                                            <td><span class="status-tag" :class="'st--' + statusKey(item.status)">{{ item.status }}</span></td>
                                            <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-batch">
                                                <template v-if="isDeleted">
                                                    <span v-if="batch.bd_number" class="field-value cell-mono">{{ batch.bd_number }}</span>
                                                    <span v-else class="cell-muted">-</span>
                                                </template>
                                                <template v-else>
                                                    <div v-if="batch.bd_number && !isEditing('bd', batch.key)" class="field-display">
                                                        <span class="field-value cell-mono">{{ batch.bd_number }}</span>
                                                        <span v-if="batch.bdStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing BD#"></span>
                                                        <span v-if="batch.bdStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting BD numbers"></span>
                                                        <button type="button" class="btn-edit" @click="startEditing('bd', batch.key)" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                                        <button type="button" class="btn-info" @click="openExportOverlay(batch)" title="Export Order Items"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
                                                    </div>
                                                    <div v-else class="input-with-btn">
                                                        <input type="text" class="inline-input" :ref="el => setBdRef(batch.key, el)" :value="batch.bd_number" placeholder="BD#" />
                                                        <button type="button" class="btn-confirm" @click="handleSetBdNumber(batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                        <button v-if="batch.bd_number" type="button" class="btn-cancel" @click="stopEditing('bd', batch.key)" title="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                                                        <button v-if="batch.bd_number" type="button" class="btn-icon btn-icon--danger" @click="handleUnsetBdNumber(batch.key)" title="Clear BD#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                                        <button type="button" class="btn-info" @click="openExportOverlay(batch)" title="Export Order Items"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
                                                    </div>
                                                </template>
                                            </td>
                                            <td>
                                                <span>{{ item.customizationSubtype }}</span>
                                            </td>
                                            <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-batch">
                                                <template v-if="isDeleted">
                                                    <a v-if="batch.do_folder" :href="batch.do_folder" target="_blank" class="field-value link">Open</a>
                                                    <span v-else class="cell-muted">-</span>
                                                </template>
                                                <template v-else>
                                                    <div v-if="batch.do_folder && !isEditing('do', batch.key)" class="field-display">
                                                        <a :href="batch.do_folder" target="_blank" class="field-value link">Open</a>
                                                        <span v-if="batch.doStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing DO link"></span>
                                                        <span v-if="batch.doStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting DO links"></span>
                                                        <button type="button" class="btn-edit" @click="startEditing('do', batch.key)" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                                    </div>
                                                    <div v-else class="input-with-btn">
                                                        <input type="text" class="inline-input inline-input--wide" :ref="el => setDoRef(batch.key, el)" :value="batch.do_folder" placeholder="Paste link" />
                                                        <button type="button" class="btn-confirm" @click="handleSetDoLink(batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                        <button v-if="batch.do_folder" type="button" class="btn-cancel" @click="stopEditing('do', batch.key)" title="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                                                        <button v-if="batch.do_folder" type="button" class="btn-icon btn-icon--danger" @click="handleUnsetDoLink(batch.key)" title="Clear DO Link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                                    </div>
                                                </template>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
            <!-- ═══ CHANGE LOG ═══ -->
            <div v-if="currentHeader && hasAnyChangeLogs" class="ops-changelog-section">
                <button type="button" class="ops-changelog-toggle" @click="changeLogOpen = !changeLogOpen">
                    <svg class="ops-changelog-chevron" :class="{ 'is-open': changeLogOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
                    <span>Change Log</span>
                </button>
                <div class="ops-changelog-wrap" :class="{ 'is-open': changeLogOpen }">
                    <div class="ops-changelog-inner">
                        <div v-if="orderPlanChangeLogs.length" class="ops-cl-sub">
                            <button type="button" class="ops-cl-sub-toggle" @click="clOrderPlanOpen = !clOrderPlanOpen">
                                <svg class="ops-cl-sub-chevron" :class="{ 'is-open': clOrderPlanOpen }" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
                                <span>Order Plan ({{ orderPlanChangeLogs.length }})</span>
                            </button>
                            <div class="ops-cl-sub-wrap" :class="{ 'is-open': clOrderPlanOpen }">
                                <div class="ops-cl-sub-inner">
                                    <div v-for="log in orderPlanChangeLogs" :key="log.id" class="ops-cl-entry">
                                        <div class="ops-cl-row">
                                            <span class="ops-cl-category">{{ log.category }}</span>
                                            <span class="ops-cl-action">{{ log.action }}</span>
                                            <span class="ops-cl-time">{{ formatDate(log.timestamp) }}</span>
                                        </div>
                                        <div class="ops-cl-desc">{{ log.description }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="bookingChangeLogs.length" class="ops-cl-sub">
                            <button type="button" class="ops-cl-sub-toggle" @click="clBookingOpen = !clBookingOpen">
                                <svg class="ops-cl-sub-chevron" :class="{ 'is-open': clBookingOpen }" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
                                <span>Attached Bookings ({{ bookingChangeLogs.length }})</span>
                            </button>
                            <div class="ops-cl-sub-wrap" :class="{ 'is-open': clBookingOpen }">
                                <div class="ops-cl-sub-inner">
                                    <div v-for="log in bookingChangeLogs" :key="log.id" class="ops-cl-entry">
                                        <div class="ops-cl-row">
                                            <span class="ops-cl-category">{{ log.category }}</span>
                                            <span class="ops-cl-action">{{ log.action }}</span>
                                            <span class="ops-cl-time">{{ formatDate(log.timestamp) }}</span>
                                        </div>
                                        <div class="ops-cl-desc">{{ log.description }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Export Overlay -->
        <div v-if="exportOverlay" class="export-overlay" @click.self="exportOverlay = null">
            <div class="export-modal">
                <div class="export-modal-header">
                    <span class="export-modal-title">{{ exportOverlay.title }}</span>
                    <button type="button" class="btn-icon" @click="exportOverlay = null">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <pre class="export-modal-body">{{ exportOverlay.text }}</pre>
                <div class="export-modal-footer">
                    <span v-if="exportCopied" class="export-copied">Copied!</span>
                    <button type="button" class="btn-action btn-action--primary" @click="copyExportText">Copy to Clipboard</button>
                    <button type="button" class="btn-action btn-action--muted" @click="exportOverlay = null">Close</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';

const LABOR_LABELS = {
    none: 'None',
    sleeving: 'Box Sleeving',
    giftbox: 'Standard Gift Box',
    giftbox_addons: 'Gift Box + Addons',
};

let _uid = 0;
function uid() { return `_u${++_uid}_${Date.now()}`; }

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        // ── Data resolution ──
        const resolvedOpHeaders = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.orderplanHeadersData) || []);
        const resolvedOpDeliveries = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.orderplanDeliveriesData) || []);
        const resolvedOpAttBookings = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.orderplanAttBookingsData) || []);
        const resolvedOpLines = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.orderplanLinesData) || []);
        const resolvedBookingHeaders = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.bookingHeaders) || []);
        const resolvedBookingItems = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.bookingItems) || []);
        const resolvedInventoryData = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.inventoryData) || []);
        const resolvedTeammates = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.teammatesList) || []);

        const selectedId = computed(() => props.content?.selectedOrderPlanId || '');
        const actionStatus = computed(() => {
            const v = props.content?.actionStatus;
            if (!v || typeof v !== 'string') return null;
            const s = v.trim().toLowerCase();
            return (s === 'successful' || s === 'failed') ? s : null;
        });

        // ── Dropdown options ──
        const custOptions = [
            { type: 'UV', subtype: 'UV 1 LOGO', customization_sku: 'UV-ICON' },
            { type: 'UV', subtype: 'UV 2 LOGO', customization_sku: 'UV-ICON-2' },
            { type: 'UV', subtype: 'UV 360', customization_sku: 'UV-360' },
            { type: 'LASER', subtype: 'Laser (1 Logo)', customization_sku: 'EGV-ICON' },
            { type: 'LASER', subtype: 'Laser (1 Large Logo)', customization_sku: 'EGV-ICON-LARGE' },
            { type: 'LASER', subtype: 'Laser (2 Logos)', customization_sku: 'EGV-ICON-2' },
            { type: 'LASER', subtype: 'Laser (Name only)', customization_sku: 'EGV-TEXT' },
            { type: 'LASER', subtype: 'Laser (1 Logo & 1 Name)', customization_sku: 'EGV-SET' },
            { type: 'LASER', subtype: 'Laser (2 Logo & 1 Name)', customization_sku: 'EGV-SET-2' },
            { type: 'UV+LASER', subtype: 'Both UV Laser (1 Logo & 1 Name)', customization_sku: 'UVEGV-SET' },
            { type: 'UV+LASER', subtype: 'Both UV Laser (2 Logo & 1 Name)', customization_sku: 'UVEGV-SET-2' },
            { type: 'UV+LASER', subtype: 'Both UV Laser (360 & 1 Name)', customization_sku: 'UVEGV-SET-360' },
            { type: 'NONE', subtype: 'None', customization_sku: 'NONE' },
        ];
        const custSkuToLabel = {};
        const custSkuToType = {};
        for (const o of custOptions) { custSkuToLabel[o.customization_sku || ''] = o.subtype; custSkuToType[o.customization_sku || ''] = o.type; }
        function custDisplay(val) { if (!val) return '-'; return custSkuToLabel[val] || val; }
        function custType(val) { if (!val || val === 'NONE') return 'NONE'; return custSkuToType[val] || 'NONE'; }
        const labOptions = computed(() => {
            const raw = props.content?.laborOptions;
            const list = (Array.isArray(raw) && raw.length) ? raw : [{ value: 'none', label: 'None' }, { value: 'sleeving', label: 'Box Sleeving' }, { value: 'giftbox', label: 'Standard Gift Box' }, { value: 'giftbox_addons', label: 'Gift Box + Addons' }];
            return list.map(o => ({ ...o, value: (!o.value && o.label === 'None') ? 'none' : o.value }));
        });

        // ── Lookup maps ──
        const inventoryLookup = computed(() => { const m = {}; for (const r of resolvedInventoryData.value) m[r.sku] = r; return m; });
        const teammateLookup = computed(() => { const m = {}; for (const t of resolvedTeammates.value) m[t.id] = t; return m; });
        const bookingHeaderLookup = computed(() => { const m = {}; for (const h of resolvedBookingHeaders.value) m[h.id] = h; return m; });
        const bookingItemLookup = computed(() => { const m = {}; for (const i of resolvedBookingItems.value) m[i.id] = i; return m; });
        const bookingItemsByHeader = computed(() => { const m = {}; for (const i of resolvedBookingItems.value) { if (!m[i.headerid]) m[i.headerid] = []; m[i.headerid].push(i); } return m; });
        const deliveryLookup = computed(() => { const m = {}; for (const d of resolvedOpDeliveries.value) m[d.id] = d; return m; });

        // ── Current order plan data ──
        const currentHeader = computed(() => resolvedOpHeaders.value.find(h => h.id === selectedId.value) || null);
        const currentDeliveries = computed(() => resolvedOpDeliveries.value.filter(d => d.headerid === selectedId.value));
        const currentAttBookings = computed(() => resolvedOpAttBookings.value.filter(ab => ab.headerid === selectedId.value));
        const currentLines = computed(() => resolvedOpLines.value.filter(l => l.headerid === selectedId.value));

        // ── Attached bookings resolved ──
        const attachedBookings = computed(() => {
            return currentAttBookings.value.map(ab => {
                const bh = bookingHeaderLookup.value[ab.booking_headerid];
                if (!bh) return null;
                const allItems = (bookingItemsByHeader.value[bh.id] || []).map(item => ({ ...item, _inv: inventoryLookup.value[item.sku] || null }));
                const items = allItems.filter(i => i.status !== 'Released');
                const releasedItems = allItems.filter(i => i.status === 'Released');
                const pic = bh.pic_id ? teammateLookup.value[bh.pic_id] : null;
                return { ...bh, _items: items, _releasedItems: releasedItems, _picName: pic?.name || '' };
            }).filter(Boolean);
        });

        // ── Change Log ──
        const changeLogData = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.changeLogData) || []);
        const orderPlanChangeLogs = computed(() => {
            const hdrId = currentHeader.value?.id;
            if (!hdrId) return [];
            return changeLogData.value
                .filter(log => log.connection === hdrId)
                .slice()
                .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        });
        const bookingChangeLogs = computed(() => {
            const attIds = new Set(currentAttBookings.value.map(a => a.booking_headerid));
            if (!attIds.size) return [];
            return changeLogData.value
                .filter(log => attIds.has(log.connection))
                .slice()
                .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        });
        const hasAnyChangeLogs = computed(() => orderPlanChangeLogs.value.length > 0 || bookingChangeLogs.value.length > 0);
        const changeLogOpen = ref(false);
        const clOrderPlanOpen = ref(false);
        const clBookingOpen = ref(false);

        // ── Lines resolved ──
        const resolvedLines = computed(() => {
            return currentLines.value.map(line => {
                const bi = bookingItemLookup.value[line.bookingitems_headerid];
                const inv = bi ? inventoryLookup.value[bi.sku] : null;
                const del = deliveryLookup.value[line.deliveries_headerid];
                return { ...line, _bookingItem: bi || null, _inv: inv || null, _delivery: del || null };
            });
        });

        const splitGroupCounts = computed(() => { const m = {}; for (const l of currentLines.value) { if (l.splitgroupid) m[l.splitgroupid] = (m[l.splitgroupid] || 0) + 1; } return m; });
        function isSplit(line) { return line.splitgroupid && (splitGroupCounts.value[line.splitgroupid] || 0) > 1; }
        const activeLines = computed(() => resolvedLines.value.filter(l => l._bookingItem?.status !== 'Released'));
        function linesForDelivery(deliveryId) { return activeLines.value.filter(l => l.deliveries_headerid === deliveryId); }
        const unassignedLines = computed(() => {
            const deliveryIds = new Set(currentDeliveries.value.map(d => d.id));
            return activeLines.value.filter(l => !l.deliveries_headerid || !deliveryIds.has(l.deliveries_headerid));
        });

        const canSubmit = computed(() => {
            const h = currentHeader.value;
            if (!h) return false;
            if (!h.title) return false;
            if (!h.pic_bda) return false;
            if (!h.pic_ops) return false;
            if (!h.quoteref) return false;
            if (!h.invoiceref) return false;
            if (currentDeliveries.value.length === 0) return false;
            if (attachedBookings.value.length === 0) return false;
            if (activeLines.value.length === 0) return false;
            for (const d of currentDeliveries.value) {
                if (!d.label) return false;
                if (!d.deadline) return false;
                if (!d.pic_name) return false;
                if (!d.pic_phone) return false;
                if (!d.address) return false;
            }
            for (const l of activeLines.value) {
                if (!l.quantity_assigned || l.quantity_assigned <= 0) return false;
                if (!l.deliveries_headerid) return false;
                if (!l.customization) return false;
                if (!l.labor) return false;
                if (l.customization && l.customization !== 'NONE' && !l.mockup_link) return false;
            }
            return true;
        });

        const canSaveForm = computed(() => {
            if (!form.title) return false;
            if (!form.pic_bda) return false;
            if (!form.pic_ops) return false;
            if (!form.quoteref) return false;
            if (!form.invoiceref) return false;
            if (formDeliveries.value.length === 0) return false;
            if (formAttachedBookingIds.value.length === 0) return false;
            for (const fd of formDeliveries.value) {
                if (!fd.label) return false;
                if (!fd.deadline) return false;
                if (!fd.pic_name) return false;
                if (!fd.pic_phone) return false;
                if (!fd.address) return false;
            }
            // Check all allocation rows
            let hasAllocs = false;
            for (const key of Object.keys(formAllocations)) {
                for (const alloc of formAllocations[key]) {
                    hasAllocs = true;
                    if (!alloc.quantity_assigned || alloc.quantity_assigned <= 0) return false;
                    if (!alloc.deliveries_uid) return false;
                    if (!alloc.customization) return false;
                    if (!alloc.labor) return false;
                }
            }
            if (!hasAllocs) return false;
            return true;
        });

        // ── Field consistency check ──
        function getFieldStatus(values) {
            const nonEmpty = values.filter(v => v);
            if (nonEmpty.length === 0) return 'empty';
            const unique = new Set(nonEmpty);
            if (unique.size > 1) return 'conflict';
            if (nonEmpty.length < values.length) return 'missing';
            return 'ok';
        }

        // ── Pipeline batches ──
        const pipelineBatches = computed(() => {
            const batchMap = {};
            for (const line of resolvedLines.value) {
                if (line._bookingItem?.status === 'Released') continue;
                const type = custType(line.customization);
                const bd = line.bd_number || '';
                const keySuffix = bd ? bd : (line._bookingItem?.headerid || line.bookingitems_headerid || '_unknown');
                const key = `${line.deliveries_headerid}::${type}::${bd ? 'bd:' + bd : 'bk:' + keySuffix}`;
                if (!batchMap[key]) {
                    batchMap[key] = { key, deliveries_headerid: line.deliveries_headerid, customizationType: type, deliveryLabel: line._delivery?.label || 'Unknown', delivery: line._delivery || null, bd_number: '', do_folder: '', labors: [], items: [], _laborSet: new Set(), _bdNumbers: [], _doFolders: [] };
                }
                const batch = batchMap[key];
                batch._bdNumbers.push(line.bd_number || '');
                batch._doFolders.push(line.do_folder || '');
                if (!batch.bd_number && line.bd_number) batch.bd_number = line.bd_number;
                if (!batch.do_folder && line.do_folder) batch.do_folder = line.do_folder;
                if (line.labor) { const label = laborDisplay(line.labor); if (label && !batch._laborSet.has(label)) { batch._laborSet.add(label); batch.labors.push(label); } }
                batch.items.push({ lineId: line.id, sku: line._bookingItem?.sku || '-', imagelink: line._inv?.imagelink || '', model: line._inv?.model || 'Unknown', color: line._inv?.color || '-', qty: line.quantity_assigned || 0, qtyDisplay: `${line.quantity_assigned || 0}/${line._bookingItem?.quantity || '?'}`, status: line._bookingItem?.status || 'Booked', customizationSubtype: custDisplay(line.customization) });
            }
            const batches = Object.values(batchMap);
            for (const batch of batches) { batch.bdStatus = getFieldStatus(batch._bdNumbers); batch.doStatus = getFieldStatus(batch._doFolders); }
            return batches;
        });

        const pipelineDeliveryGroups = computed(() => {
            const groups = [], groupMap = {};
            for (const batch of pipelineBatches.value) {
                const dId = batch.deliveries_headerid || '_none';
                if (!groupMap[dId]) { groupMap[dId] = { deliveries_headerid: dId, delivery: batch.delivery, deliveryLabel: batch.deliveryLabel, batches: [], totalItems: 0 }; groups.push(groupMap[dId]); }
                groupMap[dId].batches.push(batch); groupMap[dId].totalItems += batch.items.length;
            }
            return groups;
        });

        // ── View toggle ──
        const activeView = ref('pipeline');

        // ── Confirm action ──
        const confirmAction = ref(null);
        function confirmOrDo(action, fn) {
            if (confirmAction.value === action) { confirmAction.value = null; fn(); }
            else { confirmAction.value = action; }
        }

        // ── Helpers ──
        function getTeammateName(id) { return teammateLookup.value[id]?.name || ''; }
        function formatDate(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let hours = d.getHours(); const ampm = hours >= 12 ? 'PM' : 'AM'; hours = hours % 12 || 12;
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
        }
        function statusKey(status) { if (!status) return 'booked'; return status.toLowerCase().replace(/\s+/g, '-'); }
        function laborDisplay(val) {
            if (!val) return '';
            if (Array.isArray(val)) return val.map(v => LABOR_LABELS[v] || v).filter(Boolean).join(', ');
            return LABOR_LABELS[val] || val || '';
        }

        // ── Event handlers ──
        function handleStatusChange(bookingItemId, newStatus) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('status', 'onUpdateItemStatus', {
                booking_item_id: bookingItemId,
                new_status: newStatus,
                change_log: buildChangeLog(
                    'Item Status Updated by Operations in Operations Tool',
                    `In Order Plan ${opid}, updated booking item status to '${newStatus}' by Operations in Operations Tool.`
                ),
            });
        }

        // ── BD# / DO refs ──
        const bdRefs = {}, doRefs = {};
        function setBdRef(key, el) { if (el) bdRefs[key] = el; }
        function setDoRef(key, el) { if (el) doRefs[key] = el; }

        const editingFields = reactive({});
        function isEditing(field, key) { return !!editingFields[`${field}::${key}`]; }
        function startEditing(field, key) { editingFields[`${field}::${key}`] = true; }
        function stopEditing(field, key) { delete editingFields[`${field}::${key}`]; }

        function handleSetBdNumber(batchKey) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey); if (!batch) return;
            const value = bdRefs[batchKey]?.value || '';
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('bd_number', 'onSetBdNumber', {
                batch_key: batchKey,
                line_ids: batch.items.map(i => i.lineId),
                bd_number: value,
                change_log: buildChangeLog(
                    'BD Number Set by Operations in Operations Tool',
                    `In Order Plan ${opid}, set BD number '${value}' for batch ${batchKey} (${batch.items.length} line(s)) by Operations in Operations Tool.`
                ),
            });
            stopEditing('bd', batchKey);
        }
        function handleSetDoLink(batchKey) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey); if (!batch) return;
            const value = doRefs[batchKey]?.value || '';
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('do_link', 'onSetDoLink', {
                batch_key: batchKey,
                line_ids: batch.items.map(i => i.lineId),
                do_folder: value,
                change_log: buildChangeLog(
                    'DO Link Set by Operations in Operations Tool',
                    `In Order Plan ${opid}, set DO folder link '${value}' for batch ${batchKey} (${batch.items.length} line(s)) by Operations in Operations Tool.`
                ),
            });
            stopEditing('do', batchKey);
        }
        function handleUnsetBdNumber(batchKey) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey); if (!batch) return;
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('bd_number', 'onUnsetBdNumber', {
                batch_key: batchKey,
                line_ids: batch.items.map(i => i.lineId),
                change_log: buildChangeLog(
                    'BD Number Unset by Operations in Operations Tool',
                    `In Order Plan ${opid}, removed BD number for batch ${batchKey} (${batch.items.length} line(s)) by Operations in Operations Tool.`
                ),
            });
        }
        function handleUnsetDoLink(batchKey) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey); if (!batch) return;
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('do_link', 'onUnsetDoLink', {
                batch_key: batchKey,
                line_ids: batch.items.map(i => i.lineId),
                change_log: buildChangeLog(
                    'DO Link Unset by Operations in Operations Tool',
                    `In Order Plan ${opid}, removed DO folder link for batch ${batchKey} (${batch.items.length} line(s)) by Operations in Operations Tool.`
                ),
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // ═══ ORDER PLAN EDIT MODE ═══
        // ═══════════════════════════════════════════════════════════════════
        const hasBdNumbers = computed(() => resolvedLines.value.some(l => l.bd_number));
        const isDeleted = computed(() => (currentHeader.value?.status || '').toLowerCase() === 'deleted');

        const opEditMode = ref(false);
        const form = reactive({ title: '', quoteref: '', invoicePrefix: 'LMSB', invoiceref: '', pic_bda: '', pic_ops: '' });
        const formDeliveries = ref([]);
        const formAttachedBookingIds = ref([]);
        const formAllocations = reactive({}); // key: `${bookingHeaderId}::${bookingItemId}` => array of alloc objects
        let _attBookingRecords = {}; // lookup by booking_headerid → { id, headerid, created_at }
        const showBookingDropdown = ref(false);
        const bookingSearch = ref('');

        function enterEditMode() {
            const h = currentHeader.value;
            if (!h || isDeleted.value) return;
            form.title = h.title || '';
            form.quoteref = (h.quoteref || '').replace(/^QU-?/i, '');
            const invRaw = h.invoiceref || '';
            if (invRaw.startsWith('STPL-')) { form.invoicePrefix = 'STPL'; form.invoiceref = invRaw.slice(5); }
            else if (invRaw.startsWith('LMSB-')) { form.invoicePrefix = 'LMSB'; form.invoiceref = invRaw.slice(5); }
            else if (invRaw.startsWith('STPL')) { form.invoicePrefix = 'STPL'; form.invoiceref = invRaw.slice(4); }
            else if (invRaw.startsWith('LMSB')) { form.invoicePrefix = 'LMSB'; form.invoiceref = invRaw.slice(4); }
            else { form.invoicePrefix = 'LMSB'; form.invoiceref = invRaw; }
            form.pic_bda = h.pic_bda || '';
            form.pic_ops = h.pic_ops || '';

            // Load deliveries
            formDeliveries.value = currentDeliveries.value.map(d => ({
                _uid: uid(), _existingId: d.id,
                label: d.label || '', deliverytype: d.deliverytype || 'Klang Valley',
                address: d.address || '', remarks: d.remarks || '',
                pic_name: d.pic_name || '', pic_phone: d.pic_phone || '',
                deadline: _toKLInput(d.deadline),
                _existingHeaderid: d.headerid || null,
            }));

            // Load attached bookings (preserve ids + created_at)
            formAttachedBookingIds.value = currentAttBookings.value.map(ab => ab.booking_headerid);
            _attBookingRecords = {};
            for (const ab of currentAttBookings.value) {
                _attBookingRecords[ab.booking_headerid] = { id: ab.id, headerid: ab.headerid, created_at: ab.created_at };
            }

            // Load allocations from lines
            // Clear old
            for (const k of Object.keys(formAllocations)) delete formAllocations[k];
            // Build delivery id → uid map
            const delIdToUid = {};
            for (const fd of formDeliveries.value) { if (fd._existingId) delIdToUid[fd._existingId] = fd._uid; }

            for (const line of currentLines.value) {
                const bi = bookingItemLookup.value[line.bookingitems_headerid];
                if (!bi) continue;
                const key = `${bi.headerid}::${bi.id}`;
                if (!formAllocations[key]) formAllocations[key] = [];
                formAllocations[key].push({
                    _uid: uid(), _existingId: line.id,
                    _existingCreatedAt: line.created_at || null,
                    quantity_assigned: line.quantity_assigned || 0,
                    deliveries_uid: delIdToUid[line.deliveries_headerid] || '',
                    customization: line.customization || '',
                    mockup_link: line.mockup_link || '',
                    labor: line.labor || '',
                    splitgroupid: line.splitgroupid || '',
                    _originalCustomization: line.customization || '',
                    _originalLabor: line.labor || '',
                    _existingBdNumber: line.bd_number || null,
                });
            }

            opEditMode.value = true;
            showBookingDropdown.value = false;
        }

        function cancelEditMode() { opEditMode.value = false; }

        // ── Delivery CRUD ──
        function addFormDelivery() {
            formDeliveries.value.push({ _uid: uid(), _existingId: null, label: '', deliverytype: 'Klang Valley', address: '', remarks: '', pic_name: '', pic_phone: '', deadline: '' });
        }
        function removeFormDelivery(idx) {
            const removed = formDeliveries.value.splice(idx, 1)[0];
            // Clear allocations pointing to this delivery
            for (const key of Object.keys(formAllocations)) {
                for (const alloc of formAllocations[key]) {
                    if (alloc.deliveries_uid === removed._uid) alloc.deliveries_uid = '';
                }
            }
        }

        // ── Booking attach/detach ──
        const filteredBookingsForConnect = computed(() => {
            const q = bookingSearch.value.toLowerCase();
            return resolvedBookingHeaders.value.filter(bh => {
                if (!q) return true;
                return (bh.bookingnumber || '').toLowerCase().includes(q) || (bh.bookingtitle || '').toLowerCase().includes(q);
            });
        });
        function isBookingAttached(bhId) { return formAttachedBookingIds.value.includes(bhId); }

        function attachFormBooking(bh) {
            formAttachedBookingIds.value.push(bh.id);
            // Create default allocation rows for each item in this booking
            const items = bookingItemsByHeader.value[bh.id] || [];
            for (const item of items) {
                const key = `${bh.id}::${item.id}`;
                if (!formAllocations[key]) {
                    formAllocations[key] = [{ _uid: uid(), _existingId: null, quantity_assigned: item.quantity || 0, deliveries_uid: formDeliveries.value[0]?._uid || '', customization: '', mockup_link: '', labor: '', splitgroupid: genId() }];
                }
            }
            showBookingDropdown.value = false;
        }

        function detachFormBooking(idx) {
            const bhId = formAttachedBookingIds.value.splice(idx, 1)[0];
            // Remove allocations for this booking
            const items = bookingItemsByHeader.value[bhId] || [];
            for (const item of items) { delete formAllocations[`${bhId}::${item.id}`]; }
        }

        // ── Allocation helpers ──
        function itemsForBooking(bhId) {
            return (bookingItemsByHeader.value[bhId] || []).map(item => ({ ...item, _inv: inventoryLookup.value[item.sku] || null }));
        }

        function getAllocs(bhId, biId) { return formAllocations[`${bhId}::${biId}`] || []; }
        function allocTotal(bhId, biId) { return (formAllocations[`${bhId}::${biId}`] || []).reduce((s, a) => s + (parseInt(a.quantity_assigned) || 0), 0); }

        function allocSummaryClass(bhId, biId, total) {
            const t = allocTotal(bhId, biId);
            if (t === total) return 'alloc-summary--full';
            if (t > total) return 'alloc-summary--over';
            return 'alloc-summary--partial';
        }

        function updateAllocQty(bhId, biId, aIdx, event) {
            const allocs = formAllocations[`${bhId}::${biId}`];
            if (allocs && allocs[aIdx]) allocs[aIdx].quantity_assigned = parseInt(event.target.value) || 0;
        }

        function updateAllocField(bhId, biId, aIdx, field, value) {
            const allocs = formAllocations[`${bhId}::${biId}`];
            if (allocs && allocs[aIdx]) allocs[aIdx][field] = value;
        }

        function handleSplitAlloc(bhId, biId, aIdx) {
            const key = `${bhId}::${biId}`;
            const allocs = formAllocations[key];
            if (!allocs || !allocs[aIdx] || allocs[aIdx].quantity_assigned < 2) return;
            const src = allocs[aIdx];
            const half = Math.floor(src.quantity_assigned / 2);
            const remainder = src.quantity_assigned - half;
            src.quantity_assigned = half;
            const newAlloc = { _uid: uid(), _existingId: null, quantity_assigned: remainder, deliveries_uid: src.deliveries_uid, customization: src.customization, mockup_link: src.mockup_link, labor: src.labor, splitgroupid: src.splitgroupid || genId() };
            if (!src.splitgroupid) src.splitgroupid = newAlloc.splitgroupid;
            allocs.splice(aIdx + 1, 0, newAlloc);
        }

        function removeAllocRow(bhId, biId, aIdx) {
            const key = `${bhId}::${biId}`;
            const allocs = formAllocations[key];
            if (!allocs || allocs.length <= 1) return;
            const removed = allocs.splice(aIdx, 1)[0];
            // Merge qty to previous or next
            const target = allocs[Math.max(0, aIdx - 1)];
            if (target) target.quantity_assigned += removed.quantity_assigned;
        }

        // ── Build payload & emit ──
        function genId() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
        function genOpid() { return 'OP-' + String(Math.floor(100000 + Math.random() * 900000)); }

        function klTimestamp() {
            try { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' }).replace(' ', 'T') + '+08:00'; }
            catch (e) { return new Date().toISOString(); }
        }
        function buildChangeLog(action, description) {
            const h = currentHeader.value;
            return {
                id: genId(),
                timestamp: klTimestamp(),
                category: 'Order Plan',
                action: action,
                description: description,
                connection: h?.id || null,
            };
        }

        function _toKLInput(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return typeof iso === 'string' ? iso.slice(0, 16) : '';
            const parts = d.toLocaleString('en-GB', {
                timeZone: 'Asia/Kuala_Lumpur',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            });
            const m = parts.match(/(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2})/);
            if (!m) return typeof iso === 'string' ? iso.slice(0, 16) : '';
            return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
        }

        function _fmtDate(iso) {
            if (!iso) return '';
            let normalized = iso;
            if (!/[Z+\-]\d{2}/.test(iso.slice(10))) normalized = iso + '+08:00';
            const d = new Date(normalized);
            if (isNaN(d.getTime())) return iso;
            try {
                return d.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
            } catch (e) {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                let hrs = d.getHours(); const ap = hrs >= 12 ? 'PM' : 'AM'; hrs = hrs % 12 || 12;
                const min = String(d.getMinutes()).padStart(2, '0');
                return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hrs}:${min} ${ap}`;
            }
        }

        function _diffField(label, oldVal, newVal) {
            const o = oldVal || ''; const n = newVal || '';
            if (o === n) return null;
            if (!o && n) return `${label}: (empty) → "${n}"`;
            if (o && !n) return `${label}: "${o}" → (empty)`;
            return `${label}: "${o}" → "${n}"`;
        }

        function buildDetailedDescription(payload) {
            const h = currentHeader.value;
            const opid = payload.orderplan_headers?.opid || h?.opid || '-';
            const parts = [];

            // ── Header metadata changes ──
            const metaChanges = [];
            const mf = [
                ['Title', h.title, form.title],
                ['PIC BDA', getTeammateName(h.pic_bda) || h.pic_bda, getTeammateName(form.pic_bda) || form.pic_bda],
                ['PIC Ops', getTeammateName(h.pic_ops) || h.pic_ops, getTeammateName(form.pic_ops) || form.pic_ops],
                ['Quote Ref', h.quoteref, form.quoteref ? 'QU-' + form.quoteref : ''],
                ['Invoice Ref', h.invoiceref, form.invoiceref ? form.invoicePrefix + '-' + form.invoiceref : ''],
            ];
            for (const [label, oldV, newV] of mf) {
                const d = _diffField(label, oldV, newV);
                if (d) metaChanges.push(d);
            }
            if (metaChanges.length) parts.push('Metadata Updated:\n' + metaChanges.join('\n'));

            // ── Delivery changes ──
            const oldDels = currentDeliveries.value;
            const newDels = formDeliveries.value;
            const oldDelMap = {};
            for (const d of oldDels) oldDelMap[d.id] = d;

            for (const fd of newDels) {
                const od = fd._existingId ? oldDelMap[fd._existingId] : null;
                if (!od) {
                    parts.push(`Delivery Location Added: "${fd.label || 'Untitled'}" (${fd.deliverytype || '-'})`);
                    continue;
                }
                delete oldDelMap[fd._existingId];
                const dc = [];
                const df = [
                    ['Label', od.label, fd.label],
                    ['Type', od.deliverytype, fd.deliverytype],
                    ['Deadline', _fmtDate(od.deadline), _fmtDate(fd.deadline)],
                    ['Contact', od.pic_name, fd.pic_name],
                    ['Phone', od.pic_phone, fd.pic_phone],
                    ['Address', od.address, fd.address],
                    ['Remarks', od.remarks, fd.remarks],
                ];
                for (const [l, ov, nv] of df) { const d = _diffField(l, ov, nv); if (d) dc.push(d); }
                if (dc.length) parts.push(`Delivery "${od.label || 'Untitled'}" Updated:\n` + dc.join('\n'));
            }
            for (const removed of Object.values(oldDelMap)) {
                parts.push(`Delivery Location Removed: "${removed.label || 'Untitled'}"`);
            }

            // ── Attached bookings changes ──
            const oldBkIds = new Set(currentAttBookings.value.map(ab => ab.booking_headerid));
            const newBkIds = new Set(formAttachedBookingIds.value);
            for (const id of newBkIds) {
                if (!oldBkIds.has(id)) {
                    const bh = bookingHeaderLookup.value[id];
                    parts.push(`Booking Attached: ${bh?.bookingnumber || id} ${bh?.bookingtitle || ''}`);
                }
            }
            for (const id of oldBkIds) {
                if (!newBkIds.has(id)) {
                    const bh = bookingHeaderLookup.value[id];
                    parts.push(`Booking Detached: ${bh?.bookingnumber || id} ${bh?.bookingtitle || ''}`);
                }
            }

            // ── Allocation line changes ──
            const oldLineMap = {};
            for (const l of activeLines.value) oldLineMap[l.id] = l;
            const seenIds = new Set();

            for (const key of Object.keys(formAllocations)) {
                const [, biId] = key.split('::');
                const bi = bookingItemLookup.value[biId];
                const sku = bi?.sku || biId;
                for (const alloc of formAllocations[key]) {
                    const oid = alloc._existingId;
                    if (oid) seenIds.add(oid);
                    const ol = oid ? oldLineMap[oid] : null;
                    if (!ol) {
                        parts.push(`Allocation Added: ${sku} qty ${alloc.quantity_assigned || 0}, customization: ${custDisplay(alloc.customization)}, labor: ${laborDisplay(alloc.labor) || '-'}`);
                        continue;
                    }
                    const ac = [];
                    if ((ol.quantity_assigned || 0) !== (parseInt(alloc.quantity_assigned) || 0)) ac.push(`Qty: ${ol.quantity_assigned} → ${alloc.quantity_assigned}`);
                    const oldDel = ol._delivery?.label || ol.deliveries_headerid || '-';
                    const newDelUid = alloc.deliveries_uid;
                    const newFd = formDeliveries.value.find(fd => fd._uid === newDelUid);
                    const newDel = newFd?.label || newDelUid || '-';
                    if (oldDel !== newDel) ac.push(`Destination: "${oldDel}" → "${newDel}"`);
                    const oldCust = custDisplay(ol.customization); const newCust = custDisplay(alloc.customization);
                    if (oldCust !== newCust) ac.push(`Customization: ${oldCust} → ${newCust}`);
                    const oldLab = laborDisplay(ol.labor) || '-'; const newLab = laborDisplay(alloc.labor) || '-';
                    if (oldLab !== newLab) ac.push(`Labor: ${oldLab} → ${newLab}`);
                    const oldMock = ol.mockup_link || ''; const newMock = alloc.mockup_link || '';
                    if (oldMock !== newMock) ac.push(newMock ? `Mockup Link: set` : `Mockup Link: removed`);
                    if (ac.length) parts.push(`Allocation ${sku} Updated:\n` + ac.join('\n'));
                }
            }
            for (const [id, ol] of Object.entries(oldLineMap)) {
                if (!seenIds.has(id)) {
                    const sku = ol._bookingItem?.sku || '-';
                    parts.push(`Allocation Removed: ${sku} qty ${ol.quantity_assigned || 0}`);
                }
            }

            if (parts.length === 0) return `No changes detected for Order Plan ${opid}.`;
            return parts.join('\n\n');
        }

        function buildPayload(action) {
            const h = currentHeader.value;
            const now = new Date().toISOString();

            const delUidToId = {};
            const deliveries = formDeliveries.value.map(fd => {
                const id = fd._existingId || genId();
                delUidToId[fd._uid] = id;
                return {
                    id,
                    headerid: h.id,
                    label: fd.label,
                    deliverytype: fd.deliverytype,
                    address: fd.address,
                    remarks: fd.remarks,
                    pic_name: fd.pic_name,
                    pic_phone: fd.pic_phone,
                    deadline: fd.deadline || null,
                };
            });

            const attbookings = formAttachedBookingIds.value.map(bhId => {
                const existing = _attBookingRecords[bhId];
                return {
                    id: existing?.id || genId(),
                    headerid: h.id,
                    created_at: existing?.created_at || now,
                    booking_headerid: bhId,
                };
            });

            const lines = [];
            for (const key of Object.keys(formAllocations)) {
                const [, biId] = key.split('::');
                for (const alloc of formAllocations[key]) {
                    // Preserve BD number if customization and labor unchanged
                    const custChanged = alloc.customization !== alloc._originalCustomization;
                    const laborChanged = alloc.labor !== alloc._originalLabor;
                    const preserveBd = alloc._existingBdNumber && !custChanged && !laborChanged;

                    lines.push({
                        id: alloc._existingId || genId(),
                        headerid: h.id,
                        created_at: alloc._existingCreatedAt || now,
                        updated_at: now,
                        bookingitems_headerid: biId,
                        deliveries_headerid: delUidToId[alloc.deliveries_uid] || null,
                        customization: alloc.customization || null,
                        quantity_assigned: parseInt(alloc.quantity_assigned) || 0,
                        splitgroupid: alloc.splitgroupid || null,
                        mockup_link: alloc.mockup_link || null,
                        labor: alloc.labor || null,
                        bd_number: preserveBd ? alloc._existingBdNumber : null,
                    });
                }
            }
            return {
                action,
                orderplan_headers: {
                    id: h.id,
                    opid: h.opid,
                    title: form.title,
                    pic_bda: form.pic_bda || null,
                    pic_ops: form.pic_ops || null,
                    quoteref: form.quoteref ? 'QU-' + form.quoteref : null,
                    invoiceref: form.invoiceref ? form.invoicePrefix + '-' + form.invoiceref : null,
                    status: action === 'request_process' ? 'Submitted' : (h.status || 'Draft'),
                    created_at: h.created_at || null,
                    updated_at: now,
                    submitted_at: action === 'request_process' ? now : (h.submitted_at || null),
                },
                orderplan_deliveries: deliveries,
                orderplan_attbookings: attbookings,
                orderplan_lines: lines,
            };
        }

        function handleSaveOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const payload = buildPayload('save_draft');
            const desc = buildDetailedDescription(payload);
            payload.change_log = buildChangeLog('Order Plan Saved by Operations in Operations Tool', desc);
            dispatchAction('save', 'onSaveOrderPlan', payload);
        }

        function handleSubmitOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const payload = buildPayload('request_process');
            const desc = buildDetailedDescription(payload);
            payload.change_log = buildChangeLog('Order Plan Submitted by Operations in Operations Tool', desc);
            dispatchAction('submit', 'onSubmitOrderPlan', payload);
        }

        function handleDeleteOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('delete', 'onDeleteOrderPlan', {
                headerId: h?.id || null,
                opid: h?.opid || null,
                change_log: buildChangeLog(
                    'Order Plan Deleted by Operations in Operations Tool',
                    `Deleted Order Plan ${opid} by Operations in Operations Tool.`
                ),
            });
        }

        function handleUnsubmitOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const h = currentHeader.value;
            const opid = h?.opid || '-';
            dispatchAction('unsubmit', 'onUnsubmitOrderPlan', {
                headerId: h?.id || null,
                opid: h?.opid || null,
                status: 'Draft',
                change_log: buildChangeLog(
                    'Order Plan Unsubmitted by Operations in Operations Tool',
                    `Reverted Order Plan ${opid} from Submitted to Draft by Operations in Operations Tool.`
                ),
            });
        }

        // ── Action tracking ──
        const ACTION_LABELS = { save: 'Save', submit: 'Submit', unsubmit: 'Unsubmit', delete: 'Delete', status: 'Status Update', bd_number: 'Set BD#', do_link: 'Set DO Link' };
        const ACTION_TIMEOUT = 7000;
        const pendingAction = ref(null);
        const actionFailed = ref(false);
        const actionSuccess = ref(false);
        const actionFailedLabel = ref('');
        let _lastEvent = null;
        let _actionTimer = null;

        function startActionTimer() {
            clearActionTimer();
            _actionTimer = setTimeout(() => {
                if (pendingAction.value) {
                    actionFailedLabel.value = ACTION_LABELS[pendingAction.value] || 'Action';
                    pendingAction.value = null;
                    actionFailed.value = true;
                }
            }, ACTION_TIMEOUT);
        }
        function clearActionTimer() { if (_actionTimer) { clearTimeout(_actionTimer); _actionTimer = null; } }

        function dispatchAction(actionKey, eventName, eventPayload) {
            pendingAction.value = actionKey;
            actionFailed.value = false;
            actionSuccess.value = false;
            _lastEvent = { name: eventName, event: { value: eventPayload } };
            emit('trigger-event', _lastEvent);
            startActionTimer();
        }

        function handleRetry() {
            if (!_lastEvent) { actionFailed.value = false; return; }
            actionFailed.value = false;
            const keyMap = { onSaveOrderPlan: 'save', onSubmitOrderPlan: 'submit', onDeleteOrderPlan: 'delete', onUnsubmitOrderPlan: 'unsubmit', onUpdateItemStatus: 'status', onSetBdNumber: 'bd_number', onSetDoLink: 'do_link', onUnsetBdNumber: 'bd_number', onUnsetDoLink: 'do_link' };
            pendingAction.value = keyMap[_lastEvent.name] || 'action';
            emit('trigger-event', _lastEvent);
            startActionTimer();
        }

        watch(actionStatus, (newStatus) => {
            if (!pendingAction.value) return;
            if (newStatus === 'successful') {
                clearActionTimer();
                if (pendingAction.value === 'save' || pendingAction.value === 'submit') opEditMode.value = false;
                pendingAction.value = null;
                actionFailed.value = false;
                actionSuccess.value = true;
                setTimeout(() => { actionSuccess.value = false; }, 2000);
            } else if (newStatus === 'failed') {
                clearActionTimer();
                actionFailedLabel.value = ACTION_LABELS[pendingAction.value] || 'Action';
                pendingAction.value = null;
                actionFailed.value = true;
            }
        });

        // ── Export overlay ──
        const exportOverlay = ref(null);
        const exportCopied = ref(false);

        function openExportOverlay(batch) {
            const lines = [];
            for (const item of batch.items) {
                lines.push(`${item.sku} x${item.qty}`);
            }
            exportOverlay.value = { title: batch.bd_number || 'Order Items', text: lines.join(',\n') };
            exportCopied.value = false;
        }

        function copyExportText() {
            if (!exportOverlay.value) return;
            navigator.clipboard.writeText(exportOverlay.value.text).then(() => {
                exportCopied.value = true;
                setTimeout(() => { exportCopied.value = false; }, 2000);
            });
        }

        return {
            currentHeader, currentDeliveries, attachedBookings, resolvedTeammates,
            resolvedLines, linesForDelivery, unassignedLines, isSplit, canSubmit, canSaveForm, pipelineBatches, pipelineDeliveryGroups,
            activeView, confirmAction, confirmOrDo,
            getTeammateName, formatDate, statusKey, laborDisplay,
            handleStatusChange, handleSetBdNumber, handleSetDoLink,
            setBdRef, setDoRef, isEditing, startEditing, stopEditing,
            handleRetry, handleUnsetBdNumber, handleUnsetDoLink, pendingAction, actionFailed, actionSuccess, actionFailedLabel,
            // Order Plan Edit
            isDeleted, hasBdNumbers, opEditMode, form, formDeliveries, formAttachedBookingIds, formAllocations,
            showBookingDropdown, bookingSearch, custOptions, labOptions, custDisplay,
            enterEditMode, cancelEditMode, addFormDelivery, removeFormDelivery,
            filteredBookingsForConnect, isBookingAttached, attachFormBooking, detachFormBooking,
            itemsForBooking, getAllocs, allocTotal, allocSummaryClass,
            updateAllocQty, updateAllocField, handleSplitAlloc, removeAllocRow,
            handleSaveOrderPlan, handleSubmitOrderPlan, handleDeleteOrderPlan, handleUnsubmitOrderPlan,
            bookingHeaderLookup,
            exportOverlay, exportCopied, openExportOverlay, copyExportText,
            changeLogData, orderPlanChangeLogs, bookingChangeLogs, hasAnyChangeLogs, changeLogOpen, clOrderPlanOpen, clBookingOpen,
        };
    },
};
</script>

<style lang="scss" scoped>
$blue: #3b82f6;
$blue-dark: #2563eb;
$blue-50: #eff6ff;
$red: #ef4444;
$red-dark: #dc2626;
$red-50: #fef2f2;
$green: #059669;
$green-50: #ecfdf5;
$amber: #f59e0b;
$amber-50: #fffbeb;
$gray-900: #111827;
$gray-700: #374151;
$gray-600: #475569;
$gray-500: #6b7280;
$gray-400: #9ca3af;
$gray-300: #d1d5db;
$gray-200: #e5e7eb;
$gray-100: #f3f4f6;
$gray-50: #f9fafb;
$white: #fff;
$font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

.ops-manager {
    display: flex; flex-direction: column; width: 100%; min-height: 100%;
    background: #f0f0f0; font-family: $font; font-size: 12px; color: $gray-900; box-sizing: border-box;
}

/* ═══ CONFIRM DISMISS OVERLAY ═══ */
.confirm-dismiss-overlay { position: fixed; inset: 0; z-index: 10; cursor: default; }

/* ═══ EMPTY ═══ */
.empty-state { display: flex; align-items: center; justify-content: center; padding: 80px 20px; }
.empty-text { font-size: 14px; color: $gray-500; margin: 0; }

/* ═══ FAILED TOAST ═══ */
.action-failed-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: $red-50; border-bottom: 1px solid rgba($red, 0.15); cursor: pointer; }
.failed-text { font-size: 12px; font-weight: 600; color: $red-dark; }
.failed-retry { font-size: 11px; color: $red; text-decoration: underline; margin-left: auto; }
.action-success-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: $green-50; border-bottom: 1px solid rgba($green, 0.15); }
.success-text { font-size: 12px; font-weight: 600; color: $green; }

/* ═══ WAITING OVERLAY ═══ */
.action-waiting-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 50;
    background: rgba(255,255,255,0.7); display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 10px;
}
.action-waiting-spinner {
    width: 24px; height: 24px; border: 3px solid $gray-200; border-top-color: $blue;
    border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.action-waiting-text { font-size: 12px; font-weight: 600; color: $gray-500; }

/* ═══ HEADER BAR ═══ */
.header-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #1e293b; color: $white; }
.opid-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.12); padding: 3px 8px; font-family: $font; }
.header-title { font-size: 14px; font-weight: 600; flex: 1; }
.header-status { font-size: 10px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.status--draft { background: $gray-100; color: $gray-600; }
.status--submitted { background: $blue-50; color: $blue; }
.status--deleted { background: #fef2f2; color: #dc2626; }

/* ═══ CONTENT ═══ */
.ops-content { display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; position: relative; }
.view-content { display: flex; flex-direction: column; gap: 0; }

/* ═══ SECTIONS ═══ */
.section { padding: 16px; }
.section-heading { font-size: 11px; font-weight: 700; color: $gray-500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px; }
.count-badge { font-size: 10px; font-weight: 700; background: $gray-200; color: $gray-600; padding: 1px 6px; }
.empty-section { padding: 24px; text-align: center; color: $gray-500; font-size: 12px; border: 1px dashed $gray-300; background: $white; }
.empty-section--sm { padding: 12px; font-size: 11px; margin-top: 8px; }

/* ═══ META TABLE ═══ */
.meta-table {
    width: 100%; border-collapse: collapse; background: $white; border: 1px solid $gray-200; overflow: hidden;
    td { padding: 8px 12px; border-bottom: 1px solid $gray-100; font-size: 12px; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
}
.meta-label { font-weight: 700; color: $gray-500; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; width: 140px; white-space: nowrap; }
.meta-input { width: 100%; padding: 4px 8px; border: 1px solid $gray-200; font-size: 12px; font-family: $font; color: $gray-900; background: $white; outline: none; &:focus { border-color: $blue; } }
.meta-select { width: 100%; padding: 4px 8px; border: 1px solid $gray-200; font-size: 12px; font-family: $font; color: $gray-900; background: $white; outline: none; }
.prefixed-input {
    display: flex;
    align-items: center;
    border: 1px solid $gray-200;
    border-radius: 4px;
    overflow: hidden;
    .prefixed-input-label {
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 600;
        color: $gray-600;
        background: $gray-100;
        white-space: nowrap;
        border-right: 1px solid $gray-200;
    }
    .prefixed-input-select {
        padding: 4px 6px;
        font-size: 12px;
        font-weight: 600;
        color: $gray-600;
        background: $gray-100;
        border: none;
        border-right: 1px solid $gray-200;
        outline: none;
        cursor: pointer;
    }
    .meta-input {
        border: none;
        border-radius: 0;
        &:focus { border: none; box-shadow: none; }
    }
}

/* ═══ SHARED TABLE HELPERS ═══ */
.col-left { text-align: left; }
.cell-mono { font-family: $font; font-size: 11px; }
.cell-muted { color: $gray-400; }
.cell-neg { color: $red; font-weight: 700; }
.cell-img { width: 36px; padding: 4px 6px; }

/* ═══ STATUS ═══ */
.status-pill { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 600; }
.pill--booked { background: $blue-50; color: $blue; }
.pill--issue-raised { background: $red-50; color: $red; }
.pill--processing { background: $amber-50; color: $amber; }
.pill--delivered { background: $green-50; color: $green; }

.status-select {
    appearance: none; -webkit-appearance: none; padding: 3px 18px 3px 8px; font-size: 10px; font-weight: 600; font-family: $font; border: 1px solid transparent; cursor: pointer; outline: none;
    background-repeat: no-repeat; background-position: right 5px center; background-size: 10px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.ss--booked { background-color: $blue-50; color: $blue; }
.ss--issue-raised { background-color: $red-50; color: $red-dark; }
.ss--processing { background-color: $amber-50; color: darken($amber, 10%); }
.ss--delivered-to-production { background-color: #f5f3ff; color: #7c3aed; }
.ss--delivered-to-client { background-color: $green-50; color: $green; }
.ss--released { background-color: $gray-100; color: $gray-500; }

.status-tag {
    display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 600; font-family: $font; border-radius: 3px; white-space: nowrap;
}
.st--booked { background-color: $blue-50; color: $blue; }
.st--issue-raised { background-color: $red-50; color: $red-dark; }
.st--processing { background-color: $amber-50; color: darken($amber, 10%); }
.st--delivered-to-production { background-color: #f5f3ff; color: #7c3aed; }
.st--delivered-to-client { background-color: $green-50; color: $green; }
.st--released { background-color: $gray-100; color: $gray-500; }

/* ═══ TOGGLE BAR ═══ */
.toggle-bar { display: flex; gap: 0; padding: 0 16px; border-bottom: 2px solid $gray-200; background: $white; }
.toggle-btn {
    padding: 10px 20px; font-size: 12px; font-weight: 600; font-family: $font; color: $gray-500;
    background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; transition: all 0.15s ease;
    &:hover { color: $gray-700; }
}
.toggle-btn--active { color: $blue; border-bottom-color: $blue; }

/* ═══ EDIT BAR ═══ */
.edit-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: $white; border-bottom: 1px solid $gray-200; }
.btn-action {
    padding: 6px 14px; font-size: 11px; font-weight: 600; font-family: $font; border: none; cursor: pointer; transition: all 0.15s ease;
}
.btn-action--primary { background: #1e293b; color: $white; &:hover { background: #334155; } }
.btn-action--submit { background: $green; color: $white; &:hover { background: darken($green, 5%); } }
.btn-action--muted { background: $gray-100; color: $gray-600; &:hover { background: $gray-200; } }
.btn-action--danger { background: $red-50; color: $red; &:hover { background: $red; color: $white; } }
.btn-action--dark { background: #111827; color: $white; &:hover { background: #1f2937; } }

.btn-add {
    font-size: 11px; font-weight: 600; font-family: $font; color: $blue; background: $blue-50;
    border: none; padding: 3px 10px; cursor: pointer; margin-left: auto;
    &:hover { background: $blue; color: $white; }
}

/* ═══ EDIT INPUTS ═══ */
.edit-input {
    padding: 4px 8px; border: 1px solid $gray-300; font-size: 11px; font-family: $font;
    color: $gray-900; background: $white; outline: none;
    &:focus { border-color: $blue; }
    &::placeholder { color: $gray-400; }
}
.edit-input--title { font-size: 12px; font-weight: 700; flex: 1; }
.edit-input--date { width: 180px; }
.edit-input--qty { width: 64px; text-align: center; }
.edit-select {
    padding: 4px 8px; border: 1px solid $gray-300; font-size: 11px; font-family: $font;
    color: $gray-900; background: $white; outline: none; width: 100%;
}
.edit-select--sm { width: auto; }
.edit-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.edit-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
.edit-field { display: flex; flex-direction: column; gap: 2px; }
.edit-label { font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; }
.edit-textarea {
    width: 100%; padding: 4px 8px; border: 1px solid $gray-300; font-size: 11px; font-family: $font;
    color: $gray-900; background: $white; outline: none; resize: vertical; margin-top: 6px;
    &:focus { border-color: $blue; }
}

/* ═══ ICON BUTTONS ═══ */
.btn-icon {
    display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;
    padding: 0; border: none; background: transparent; color: $gray-400; cursor: pointer;
    svg { width: 14px; height: 14px; }
    &:hover { color: $gray-700; }
}
.btn-icon--danger { &:hover { color: $red; } }
.btn-icon--disabled { opacity: 0.3; cursor: not-allowed; }

/* ═══ CONNECT BOOKING DROPDOWN ═══ */
.connect-booking-wrap { position: relative; margin-left: auto; }
.booking-dropdown {
    position: absolute; top: 100%; right: 0; z-index: 20; width: 320px;
    background: $white; border: 1px solid $gray-200; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    display: flex; flex-direction: column; max-height: 260px;
}
.booking-dropdown-search { padding: 8px 8px 6px; flex-shrink: 0; position: sticky; top: 0; background: $white; z-index: 1; }
.booking-dropdown-list { overflow-y: auto; padding: 0 8px 8px; flex: 1; }
.bk-option {
    display: flex; align-items: center; gap: 8px; padding: 6px 8px; font-size: 11px; cursor: pointer;
    &:hover { background: $gray-50; }
}
.bk-option--attached { opacity: 0.5; cursor: default; &:hover { background: transparent; } }
.bk-attached-label { font-size: 9px; font-weight: 700; color: $green; text-transform: uppercase; margin-left: auto; }

/* ═══ ALLOCATION BLOCKS ═══ */
.alloc-booking-header {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: #1e293b; color: $white; font-size: 12px;
}
.alloc-sku-block { border-top: 1px solid $gray-200; }
.alloc-sku-header { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: $gray-50; }
.alloc-summary { font-size: 12px; font-weight: 700; margin-left: auto; font-family: $font; }
.alloc-summary--full { color: $green; }
.alloc-summary--over { color: $red; }
.alloc-summary--partial { color: $gray-400; }
.alloc-table { font-size: 11px; }
.alloc-row--split td:first-child { border-left: 3px solid $blue; }
.alloc-actions { display: flex; gap: 4px; }

/* ═══ INLINE INPUT + CONFIRM BUTTON ═══ */
.input-with-btn { display: flex; align-items: center; gap: 3px; }
.inline-input {
    width: 100%; max-width: 80px; height: 26px; padding: 0 6px; border: 1px solid $gray-200;
    font-size: 11px; font-family: $font; color: $gray-900; background: $white; outline: none;
    transition: border-color 0.15s ease;
    &::placeholder { color: $gray-400; }
    &:focus { border-color: $blue; }
}
.inline-input--wide { max-width: 100%; }

/* ═══ FIELD DISPLAY ═══ */
.field-display { display: flex; align-items: center; gap: 5px; }
.field-value { font-size: 11px; color: $gray-900; }
.btn-edit {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border: none;
    background: transparent; color: $gray-400; cursor: pointer; transition: all 0.15s ease;
    svg { width: 12px; height: 12px; }
    &:hover { background: $blue-50; color: $blue; }
}
.btn-info {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border: none;
    background: transparent; color: $gray-400; cursor: pointer; transition: all 0.15s ease;
    svg { width: 14px; height: 14px; }
    &:hover { background: $blue-50; color: $blue; }
}
.btn-cancel {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; padding: 0; border: none;
    background: $gray-100; color: $gray-500; cursor: pointer; transition: all 0.15s ease;
    svg { width: 12px; height: 12px; }
    &:hover { background: $red-50; color: $red; }
}
.btn-confirm {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; padding: 0; border: none;
    background: var(--c-confirm-bg, #1e293b); color: $white; cursor: pointer; transition: background 0.15s ease;
    svg { width: 12px; height: 12px; }
    &:hover { background: #334155; }
}

/* ═══ STATUS DOT ═══ */
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; cursor: help; position: relative; }
.status-dot--warn { background: $amber; }
.status-dot--error { background: $red; }

/* ═══ TAGS ═══ */
.split-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #7c3aed; background: #f5f3ff; padding: 1px 5px; }
.labor-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #0d9488; background: #f0fdfa; padding: 1px 5px; margin-left: 4px; }
.link { color: $blue; font-size: 11px; text-decoration: none; &:hover { text-decoration: underline; } }

/* ═══ PIPELINE CARDS ═══ */
.pipe-card { border: 1px solid $gray-200; overflow: hidden; margin-bottom: 12px; background: $white; }
.pipe-card-header { background: #f1f5f9; border-bottom: 1px solid $gray-200; padding: 8px 12px; }
.pipe-card-header-main { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.pipe-card-title { font-size: 12px; font-weight: 700; color: inherit; }
.pipe-dtype-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: $gray-200; padding: 2px 7px; color: $gray-600; }
.pipe-card-meta { font-size: 11px; color: $gray-500; line-height: 1.4; }
.pipe-card-meta-row { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.pipe-card-deadline { font-size: 11px; font-weight: 600; color: #b45309; }
.pipe-card-contact { font-size: 11px; color: $gray-400; }
.pipe-card-remarks { font-size: 10px; color: $gray-400; font-style: italic; margin-top: 4px; }

/* Pipeline table */
.pipe-table {
    width: 100%; border-collapse: collapse; background: $white; table-layout: fixed;
    th { padding: 5px 8px; font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; border-bottom: 1px solid $gray-200; background: var(--c-th-bg, $gray-50); }
    td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid $gray-50; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
    tr:last-child td { border-bottom: none; }
}
.batch-first td { border-top: 2px solid var(--c-batch-sep, $gray-200); }
.batch-header-row td { padding: 6px 10px; background: $gray-100; border-bottom: 1px solid $gray-200; text-align: right; }
.batch-type-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 3px; }
.pipe-table tbody tr:first-child td { border-top: none; }
.cell-batch { vertical-align: middle; background: $gray-50; border-left: 1px solid $gray-200; padding: 6px 10px; }
.thumb-sm { width: 28px; height: 28px; object-fit: cover; display: block; }

/* ═══ TABLE SCROLL (responsive) ═══ */
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* ═══ EXPORT BUTTON ═══ */
/* ═══ EXPORT OVERLAY ═══ */
.export-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100;
    background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
}
.export-modal {
    background: $white; width: 480px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column;
    border: 1px solid $gray-200; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.export-modal-header {
    display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;
    border-bottom: 1px solid $gray-200;
}
.export-modal-title { font-size: 13px; font-weight: 700; color: $gray-900; }
.export-modal-body {
    padding: 16px; font-size: 12px; font-family: $font;
    line-height: 1.6; color: $gray-700; white-space: pre-wrap; word-break: break-all;
    overflow-y: auto; flex: 1; margin: 0; background: $gray-50;
}
.export-modal-footer {
    display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-top: 1px solid $gray-200;
    justify-content: flex-end;
}
.export-copied { font-size: 11px; font-weight: 600; color: $green; margin-right: auto; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1024px) {
    .pipe-table { min-width: 700px; }
    .alloc-table { min-width: 580px; }
}
@media (max-width: 700px) {
    .section { padding: 12px; }
    .header-bar { padding: 10px 12px; flex-wrap: wrap; }
    .meta-label { width: 100px; }
    .toggle-btn { padding: 8px 12px; font-size: 11px; }
    .edit-bar { flex-wrap: wrap; }
    .pipe-table { min-width: 750px; }
}

/* ═══ VALIDATION INDICATORS ═══ */
.submitted-notice { font-size: 12px; color: $gray-500; font-style: italic; }
.req { color: #ef4444; font-weight: 700; margin-left: 2px; }
.released-details { margin-top: 4px; }
.released-summary { font-size: 10px; color: $gray-400; cursor: pointer; padding: 4px 8px; font-style: italic; }
.released-summary:hover { color: $gray-600; }
.released-table { opacity: 0.5; }
.bd-warn-banner { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 12px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; }
.pipe-card--warn { border: 1px solid #fca5a5; }
.btn-action--confirm { background: $amber; color: $white; &:hover { background: darken($amber, 8%); } }

/* ── Change Log section ── */
.ops-changelog-section {
    border-top: 1px solid #e5e7eb;
    margin-top: 8px;
}
.ops-changelog-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #6b7280;
    &:hover { color: #374151; }
}
.ops-changelog-chevron {
    transition: transform 0.15s;
    &.is-open { transform: rotate(90deg); }
}
.ops-changelog-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
    &.is-open { grid-template-rows: 1fr; }
}
.ops-changelog-inner {
    overflow: hidden;
    min-height: 0;
}
.ops-cl-entry {
    padding: 8px 14px;
    border-bottom: 1px solid #f3f4f6;
    &:last-child { border-bottom: none; }
}
.ops-cl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
}
.ops-cl-category {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #6b7280;
}
.ops-cl-action {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
}
.ops-cl-time {
    font-size: 11px;
    color: #9ca3af;
    white-space: nowrap;
}
.ops-cl-desc {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.4;
    white-space: pre-line;
}
.ops-cl-sub {
    border-bottom: 1px solid #f3f4f6;
    &:last-child { border-bottom: none; }
}
.ops-cl-sub-toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 8px 14px;
    background: #f9fafb;
    border: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    &:hover { color: #374151; }
}
.ops-cl-sub-chevron {
    transition: transform 0.15s;
    &.is-open { transform: rotate(90deg); }
}
.ops-cl-sub-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
    &.is-open { grid-template-rows: 1fr; }
}
.ops-cl-sub-inner {
    overflow: hidden;
    min-height: 0;
    max-height: 200px;
    overflow-y: auto;
}
</style>
