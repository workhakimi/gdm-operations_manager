<template>
    <div class="ops-manager" :style="{ '--c-batch-sep': content.colorBatchSeparator, '--c-th-bg': content.colorTableHeaderBg, '--c-confirm-bg': content.colorConfirmBtnBg }">
        <!-- ═══ EMPTY STATE ═══ -->
        <div v-if="!currentHeader" class="empty-state">
            <p class="empty-text">Select an order plan to view operations.</p>
        </div>

        <!-- ═══ MAIN CONTENT ═══ -->
        <div v-else class="ops-content">
            <!-- Failed toast -->
            <div v-if="actionFailed" class="action-failed-bar" @click="handleRetry">
                <span class="failed-text">{{ actionFailedLabel }} failed.</span>
                <span class="failed-retry">Click to retry</span>
            </div>

            <!-- Header Bar -->
            <div class="header-bar" :style="{ background: content.colorHeaderBarBg }">
                <span class="opid-badge">{{ currentHeader.opid }}</span>
                <span class="header-title">{{ currentHeader.title }}</span>
                <span class="header-status" :class="'status--' + (currentHeader.status || '').toLowerCase()">{{ currentHeader.status || 'Draft' }}</span>
            </div>

            <!-- Section: Order Metadata -->
            <section class="section">
                <h3 class="section-heading">Order Metadata</h3>
                <table class="meta-table">
                    <tbody>
                        <tr><td class="meta-label">Title</td><td><input v-if="opEditMode" type="text" class="meta-input" v-model="form.title" placeholder="Order title" /><span v-else>{{ currentHeader.title || '-' }}</span></td></tr>
                        <tr><td class="meta-label">Quote Ref</td><td><input v-if="opEditMode" type="text" class="meta-input" v-model="form.quoteref" placeholder="Q-202X-XXX" /><span v-else>{{ currentHeader.quoteref || '-' }}</span></td></tr>
                        <tr><td class="meta-label">Invoice Ref</td><td><input v-if="opEditMode" type="text" class="meta-input" v-model="form.invoiceref" placeholder="INV-202X-XXX" /><span v-else>{{ currentHeader.invoiceref || '-' }}</span></td></tr>
                        <tr><td class="meta-label">PIC (BDA)</td><td>
                            <select v-if="opEditMode" class="meta-select" v-model="form.pic_bda">
                                <option value="">Not assigned</option>
                                <option v-for="t in resolvedTeammates" :key="t.id" :value="t.id">{{ t.name }}</option>
                            </select>
                            <span v-else>{{ getTeammateName(currentHeader.pic_bda) || 'Not assigned' }}</span>
                        </td></tr>
                        <tr><td class="meta-label">PIC (OPS)</td><td>
                            <select v-if="opEditMode" class="meta-select" v-model="form.pic_ops">
                                <option value="">Not assigned</option>
                                <option v-for="t in resolvedTeammates" :key="t.id" :value="t.id">{{ t.name }}</option>
                            </select>
                            <span v-else>{{ getTeammateName(currentHeader.pic_ops) || 'Not assigned' }}</span>
                        </td></tr>
                        <tr><td class="meta-label">Status</td><td>{{ currentHeader.status || 'Draft' }}</td></tr>
                        <tr><td class="meta-label">Created</td><td>{{ formatDate(currentHeader.created_at) }}</td></tr>
                        <tr v-if="currentHeader.submitted_at"><td class="meta-label">Submitted</td><td>{{ formatDate(currentHeader.submitted_at) }}</td></tr>
                    </tbody>
                </table>
            </section>

            <!-- Section: Attached Bookings -->
            <section class="section">
                <h3 class="section-heading">Attached Bookings <span class="count-badge">{{ attachedBookings.length }}</span></h3>
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
                    <table class="pipe-table">
                        <colgroup>
                            <col style="width:32px" />
                            <col style="width:110px" />
                            <col style="width:20%" />
                            <col style="width:80px" />
                            <col style="width:60px" />
                            <col style="width:90px" />
                            <col style="width:80px" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th></th>
                                <th>SKU</th>
                                <th>Model</th>
                                <th>Color</th>
                                <th class="col-right">Qty</th>
                                <th>Status</th>
                                <th class="col-right">Bal Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in booking._items" :key="item.id">
                                <td class="cell-img"><img v-if="item._inv?.imagelink" :src="item._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                <td class="cell-mono">{{ item.sku }}</td>
                                <td>{{ item._inv?.model || 'Unknown' }}</td>
                                <td>{{ item._inv?.color || '-' }}</td>
                                <td class="col-right">{{ item.quantity }}</td>
                                <td>
                                    <select class="status-select" :class="'ss--' + statusKey(item.status)" :value="item.status || 'Booked'" @change="handleStatusChange(item.id, $event.target.value)">
                                        <option value="Booked">Booked</option>
                                        <option value="Issue Raised">Issue Raised</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                </td>
                                <td class="col-right cell-mono" :class="{ 'cell-neg': (item.balanceref ?? 0) < 0 }">{{ item.balanceref ?? '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Toggle Bar -->
            <div class="toggle-bar">
                <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': activeView === 'orderplan' }" @click="activeView = 'orderplan'">Order Plan View</button>
                <button type="button" class="toggle-btn" :class="{ 'toggle-btn--active': activeView === 'pipeline' }" @click="activeView = 'pipeline'">Pipeline Manager</button>
            </div>

            <!-- ═══ ORDER PLAN VIEW (INTERACTIVE EDITOR) ═══ -->
            <div v-if="activeView === 'orderplan'" class="view-content">
                <!-- Edit bar -->
                <div class="edit-bar">
                    <template v-if="!opEditMode">
                        <button type="button" class="btn-action btn-action--primary" @click="enterEditMode">Edit Order Plan</button>
                    </template>
                    <template v-else>
                        <button type="button" class="btn-action btn-action--muted" @click="cancelEditMode">Cancel</button>
                        <button type="button" class="btn-action btn-action--primary" @click="handleSaveOrderPlan">Save Draft</button>
                        <button type="button" class="btn-action btn-action--submit" @click="handleSubmitOrderPlan">Submit</button>
                        <button type="button" class="btn-action btn-action--danger" @click="handleDeleteOrderPlan">Delete</button>
                    </template>
                </div>

                <!-- Delivery Cards -->
                <section class="section">
                    <h3 class="section-heading">
                        Delivery Locations <span class="count-badge">{{ opEditMode ? formDeliveries.length : currentDeliveries.length }}</span>
                        <button v-if="opEditMode" type="button" class="btn-add" @click="addFormDelivery">+ Add Location</button>
                    </h3>

                    <!-- READ-ONLY MODE -->
                    <template v-if="!opEditMode">
                        <div v-if="currentDeliveries.length === 0" class="empty-section">No deliveries configured.</div>
                        <div v-for="del in currentDeliveries" :key="del.id" class="pipe-card">
                            <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                                <div class="pipe-card-header-main">
                                    <span class="pipe-card-title">{{ del.label || 'Unnamed Location' }}</span>
                                    <span v-if="del.deliverytype" class="pipe-dtype-tag">{{ del.deliverytype }}</span>
                                </div>
                                <div v-if="del.address" class="pipe-card-meta">{{ del.address }}</div>
                                <div class="pipe-card-meta-row">
                                    <span v-if="del.deadline" class="pipe-card-deadline">{{ formatDate(del.deadline) }}</span>
                                    <span v-if="del.pic_name" class="pipe-card-contact">{{ del.pic_name }}<span v-if="del.pic_phone"> · {{ del.pic_phone }}</span></span>
                                </div>
                                <div v-if="del.remarks" class="pipe-card-remarks">{{ del.remarks }}</div>
                            </div>
                            <div v-if="linesForDelivery(del.id).length > 0">
                                <table class="pipe-table">
                                    <colgroup>
                                        <col style="width:32px" /><col style="width:110px" /><col style="width:14%" /><col style="width:70px" /><col style="width:55px" /><col style="width:45px" /><col style="width:110px" /><col style="width:80px" /><col style="width:85px" /><col style="width:60px" />
                                    </colgroup>
                                    <thead><tr><th></th><th>SKU</th><th>Model</th><th>Color</th><th class="col-right">Qty</th><th>Split</th><th>Customization</th><th>Labor</th><th>Status</th><th>Mockup</th></tr></thead>
                                    <tbody>
                                        <tr v-for="line in linesForDelivery(del.id)" :key="line.id">
                                            <td class="cell-img"><img v-if="line._inv?.imagelink" :src="line._inv.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                            <td class="cell-mono">{{ line._bookingItem?.sku || '-' }}</td>
                                            <td>{{ line._inv?.model || 'Unknown' }}</td>
                                            <td>{{ line._inv?.color || '-' }}</td>
                                            <td class="col-right cell-mono">{{ line.quantity_assigned }}/{{ line._bookingItem?.quantity || '?' }}</td>
                                            <td><span v-if="isSplit(line)" class="split-tag">Split</span><span v-else class="cell-muted">-</span></td>
                                            <td>{{ line.customization || 'None' }}</td>
                                            <td>{{ laborDisplay(line.labor) || 'None' }}</td>
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
                    </template>

                    <!-- EDIT MODE: Delivery Cards -->
                    <template v-if="opEditMode">
                        <div v-if="formDeliveries.length === 0" class="empty-section">No deliveries. Click "+ Add Location" above.</div>
                        <div v-for="(fd, fdIdx) in formDeliveries" :key="fd._uid" class="pipe-card">
                            <div class="pipe-card-header" :style="{ background: content.colorCardHeaderBg, color: content.colorCardHeaderText }">
                                <div class="pipe-card-header-main">
                                    <input type="text" class="edit-input edit-input--title" v-model="fd.label" placeholder="Location name" />
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
                                    <input type="datetime-local" class="edit-input" v-model="fd.deadline" />
                                    <input type="text" class="edit-input" v-model="fd.pic_name" placeholder="Contact name" />
                                    <input type="text" class="edit-input" v-model="fd.pic_phone" placeholder="Phone" />
                                </div>
                                <textarea class="edit-textarea" v-model="fd.address" placeholder="Delivery address" rows="2"></textarea>
                                <input type="text" class="edit-input" v-model="fd.remarks" placeholder="Remarks (optional)" style="width:100%;margin-top:4px" />
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
                                <input type="text" class="edit-input" v-model="bookingSearch" placeholder="Search bookings..." style="margin-bottom:6px" />
                                <div v-for="bh in filteredBookingsForConnect" :key="bh.id" class="bk-option" :class="{ 'bk-option--attached': isBookingAttached(bh.id) }" @click="!isBookingAttached(bh.id) && attachFormBooking(bh)">
                                    <span class="cell-mono">{{ bh.bookingnumber }}</span>
                                    <span>{{ bh.bookingtitle || '' }}</span>
                                    <span v-if="isBookingAttached(bh.id)" class="bk-attached-label">Attached</span>
                                </div>
                                <div v-if="filteredBookingsForConnect.length === 0" class="cell-muted" style="padding:8px;text-align:center">No bookings found</div>
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
                            <table class="pipe-table alloc-table">
                                <colgroup>
                                    <col style="width:60px" /><col style="width:28%" /><col style="width:22%" /><col style="width:18%" /><col /><col style="width:60px" />
                                </colgroup>
                                <thead><tr><th>Qty</th><th>Destination</th><th>Customization</th><th>Labor</th><th>Mockup</th><th>Action</th></tr></thead>
                                <tbody>
                                    <tr v-for="(alloc, aIdx) in getAllocs(fabId, item.id)" :key="alloc._uid" :class="{ 'alloc-row--split': getAllocs(fabId, item.id).length > 1 }">
                                        <td><input type="number" class="edit-input edit-input--qty" :value="alloc.quantity_assigned" @input="updateAllocQty(fabId, item.id, aIdx, $event)" min="0" /></td>
                                        <td>
                                            <select class="edit-select" :value="alloc.deliveries_uid" @change="updateAllocField(fabId, item.id, aIdx, 'deliveries_uid', $event.target.value)">
                                                <option value="">Select delivery...</option>
                                                <option v-for="fd in formDeliveries" :key="fd._uid" :value="fd._uid">{{ fd.label || 'Unnamed' }} ({{ fd.deliverytype || '?' }})</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select class="edit-select" :value="alloc.customization" @change="updateAllocField(fabId, item.id, aIdx, 'customization', $event.target.value)">
                                                <option v-for="opt in custOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select class="edit-select" :value="alloc.labor" @change="updateAllocField(fabId, item.id, aIdx, 'labor', $event.target.value)">
                                                <option v-for="opt in labOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input v-if="alloc.customization && alloc.customization !== 'None'" type="text" class="edit-input" :value="alloc.mockup_link" @input="updateAllocField(fabId, item.id, aIdx, 'mockup_link', $event.target.value)" placeholder="URL" />
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
                </section>
            </div>

            <!-- ═══ PIPELINE MANAGER VIEW ═══ -->
            <div v-if="activeView === 'pipeline'" class="view-content">
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
                                <span v-if="group.delivery?.deadline" class="pipe-card-deadline">{{ formatDate(group.delivery.deadline) }}</span>
                                <span v-if="group.delivery?.pic_name" class="pipe-card-contact">{{ group.delivery.pic_name }}<span v-if="group.delivery?.pic_phone"> · {{ group.delivery.pic_phone }}</span></span>
                            </div>
                            <div v-if="group.delivery?.remarks" class="pipe-card-remarks">{{ group.delivery.remarks }}</div>
                        </div>

                        <table class="pipe-table">
                            <colgroup>
                                <col style="width:32px" /><col style="width:18%" /><col style="width:80px" /><col style="width:60px" /><col style="width:110px" /><col /><col style="width:130px" />
                            </colgroup>
                            <thead><tr><th></th><th>Model</th><th>Color</th><th class="col-right">Qty</th><th>BD#</th><th>Customization</th><th>DO Folder</th></tr></thead>
                            <tbody>
                                <template v-for="batch in group.batches" :key="batch.key">
                                    <tr v-for="(item, itemIdx) in batch.items" :key="item.lineId" :class="{ 'batch-first': itemIdx === 0 }">
                                        <td class="cell-img"><img v-if="item.imagelink" :src="item.imagelink" class="thumb-sm" /><span v-else class="cell-muted">-</span></td>
                                        <td>{{ item.model }}</td>
                                        <td>{{ item.color }}</td>
                                        <td class="col-right cell-mono">{{ item.qtyDisplay }}</td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-batch">
                                            <div v-if="batch.bd_number && !isEditing('bd', batch.key)" class="field-display">
                                                <span class="field-value cell-mono">{{ batch.bd_number }}</span>
                                                <span v-if="batch.bdStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing BD#"></span>
                                                <span v-if="batch.bdStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting BD numbers"></span>
                                                <button type="button" class="btn-edit" @click="startEditing('bd', batch.key)" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                            </div>
                                            <div v-else class="input-with-btn">
                                                <input type="text" class="inline-input" :ref="el => setBdRef(batch.key, el)" :value="batch.bd_number" placeholder="BD#" />
                                                <button type="button" class="btn-confirm" @click="handleSetBdNumber(batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                <button v-if="batch.bd_number" type="button" class="btn-cancel" @click="stopEditing('bd', batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                            </div>
                                        </td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-batch">
                                            <span>{{ batch.customization || 'None' }}</span>
                                            <span v-for="l in batch.labors" :key="l" class="labor-tag">{{ l }}</span>
                                        </td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-batch">
                                            <div v-if="batch.do_folder && !isEditing('do', batch.key)" class="field-display">
                                                <a :href="batch.do_folder" target="_blank" class="field-value link">Open</a>
                                                <span v-if="batch.doStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing DO link"></span>
                                                <span v-if="batch.doStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting DO links"></span>
                                                <button type="button" class="btn-edit" @click="startEditing('do', batch.key)" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                            </div>
                                            <div v-else class="input-with-btn">
                                                <input type="text" class="inline-input inline-input--wide" :ref="el => setDoRef(batch.key, el)" :value="batch.do_folder" placeholder="Paste link" />
                                                <button type="button" class="btn-confirm" @click="handleSetDoLink(batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
                                                <button v-if="batch.do_folder" type="button" class="btn-cancel" @click="stopEditing('do', batch.key)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';

const LABOR_LABELS = {
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
        const custOptions = computed(() => {
            const raw = props.content?.customizationOptions;
            if (Array.isArray(raw) && raw.length) return raw;
            return [{ value: 'None', label: 'None' }, { value: 'UV 1 Logo', label: 'UV 1 Logo' }, { value: 'UV 2 Logo', label: 'UV 2 Logo' }, { value: 'UV 360', label: 'UV 360' }, { value: 'Laser Engraving', label: 'Laser Engraving' }, { value: 'Debossing', label: 'Debossing' }];
        });
        const labOptions = computed(() => {
            const raw = props.content?.laborOptions;
            if (Array.isArray(raw) && raw.length) return raw;
            return [{ value: '', label: 'None' }, { value: 'sleeving', label: 'Box Sleeving' }, { value: 'giftbox', label: 'Standard Gift Box' }, { value: 'giftbox_addons', label: 'Gift Box + Addons' }];
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
                const items = (bookingItemsByHeader.value[bh.id] || []).map(item => ({ ...item, _inv: inventoryLookup.value[item.sku] || null }));
                const pic = bh.pic_id ? teammateLookup.value[bh.pic_id] : null;
                return { ...bh, _items: items, _picName: pic?.name || '' };
            }).filter(Boolean);
        });

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
        function linesForDelivery(deliveryId) { return resolvedLines.value.filter(l => l.deliveries_headerid === deliveryId); }

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
                const key = `${line.deliveries_headerid}::${line.customization || 'None'}`;
                if (!batchMap[key]) {
                    batchMap[key] = { key, deliveries_headerid: line.deliveries_headerid, customization: line.customization || 'None', deliveryLabel: line._delivery?.label || 'Unknown', delivery: line._delivery || null, bd_number: '', do_folder: '', labors: [], items: [], _laborSet: new Set(), _bdNumbers: [], _doFolders: [] };
                }
                const batch = batchMap[key];
                batch._bdNumbers.push(line.bd_number || '');
                batch._doFolders.push(line.do_folder || '');
                if (!batch.bd_number && line.bd_number) batch.bd_number = line.bd_number;
                if (!batch.do_folder && line.do_folder) batch.do_folder = line.do_folder;
                if (line.labor) { const label = laborDisplay(line.labor); if (label && !batch._laborSet.has(label)) { batch._laborSet.add(label); batch.labors.push(label); } }
                batch.items.push({ lineId: line.id, imagelink: line._inv?.imagelink || '', model: line._inv?.model || 'Unknown', color: line._inv?.color || '-', qtyDisplay: `${line.quantity_assigned || 0}/${line._bookingItem?.quantity || '?'}` });
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
            emit('trigger-event', { name: 'onUpdateItemStatus', event: { value: { booking_item_id: bookingItemId, new_status: newStatus } } });
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
            emit('trigger-event', { name: 'onSetBdNumber', event: { value: { batch_key: batchKey, line_ids: batch.items.map(i => i.lineId), bd_number: value } } });
            stopEditing('bd', batchKey);
        }
        function handleSetDoLink(batchKey) {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey); if (!batch) return;
            const value = doRefs[batchKey]?.value || '';
            emit('trigger-event', { name: 'onSetDoLink', event: { value: { batch_key: batchKey, line_ids: batch.items.map(i => i.lineId), do_folder: value } } });
            stopEditing('do', batchKey);
        }

        // ═══════════════════════════════════════════════════════════════════
        // ═══ ORDER PLAN EDIT MODE ═══
        // ═══════════════════════════════════════════════════════════════════
        const opEditMode = ref(false);
        const form = reactive({ title: '', quoteref: '', invoiceref: '', pic_bda: '', pic_ops: '' });
        const formDeliveries = ref([]);
        const formAttachedBookingIds = ref([]);
        const formAllocations = reactive({}); // key: `${bookingHeaderId}::${bookingItemId}` => array of alloc objects
        const showBookingDropdown = ref(false);
        const bookingSearch = ref('');

        function enterEditMode() {
            const h = currentHeader.value;
            if (!h) return;
            form.title = h.title || '';
            form.quoteref = h.quoteref || '';
            form.invoiceref = h.invoiceref || '';
            form.pic_bda = h.pic_bda || '';
            form.pic_ops = h.pic_ops || '';

            // Load deliveries
            formDeliveries.value = currentDeliveries.value.map(d => ({
                _uid: uid(), _existingId: d.id,
                label: d.label || '', deliverytype: d.deliverytype || 'Klang Valley',
                address: d.address || '', remarks: d.remarks || '',
                pic_name: d.pic_name || '', pic_phone: d.pic_phone || '',
                deadline: d.deadline ? d.deadline.slice(0, 16) : '',
            }));

            // Load attached bookings
            formAttachedBookingIds.value = currentAttBookings.value.map(ab => ab.booking_headerid);

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
                    quantity_assigned: line.quantity_assigned || 0,
                    deliveries_uid: delIdToUid[line.deliveries_headerid] || '',
                    customization: line.customization || 'None',
                    mockup_link: line.mockup_link || '',
                    labor: line.labor || '',
                    splitgroupid: line.splitgroupid || '',
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
                    formAllocations[key] = [{ _uid: uid(), _existingId: null, quantity_assigned: item.quantity || 0, deliveries_uid: formDeliveries.value[0]?._uid || '', customization: 'None', mockup_link: '', labor: '', splitgroupid: uid() }];
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
            const newAlloc = { _uid: uid(), _existingId: null, quantity_assigned: remainder, deliveries_uid: src.deliveries_uid, customization: src.customization, mockup_link: src.mockup_link, labor: src.labor, splitgroupid: src.splitgroupid || uid() };
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
        function buildPayload(action) {
            const h = currentHeader.value;
            const now = new Date().toISOString();
            const delUidToIdx = {};
            const deliveries = formDeliveries.value.map((fd, i) => { delUidToIdx[fd._uid] = i; return { id: fd._existingId || null, headerid: h.id, label: fd.label, deliverytype: fd.deliverytype, address: fd.address, remarks: fd.remarks, pic_name: fd.pic_name, pic_phone: fd.pic_phone, deadline: fd.deadline || null, _uid: fd._uid }; });
            const attbookings = formAttachedBookingIds.value.map(bhId => {
                const existing = currentAttBookings.value.find(ab => ab.booking_headerid === bhId);
                return { id: existing?.id || null, headerid: h.id, booking_headerid: bhId };
            });
            const lines = [];
            for (const key of Object.keys(formAllocations)) {
                const [, biId] = key.split('::');
                for (const alloc of formAllocations[key]) {
                    lines.push({
                        id: alloc._existingId || null, headerid: h.id,
                        bookingitems_headerid: biId,
                        deliveries_headerid: null, // resolved on backend via _deliveries_uid
                        _deliveries_uid: alloc.deliveries_uid,
                        customization: alloc.customization === 'None' ? null : alloc.customization,
                        quantity_assigned: parseInt(alloc.quantity_assigned) || 0,
                        splitgroupid: alloc.splitgroupid || null,
                        mockup_link: alloc.mockup_link || null,
                        labor: alloc.labor || null,
                    });
                }
            }
            return {
                action,
                orderplan_headers: {
                    id: h.id, opid: h.opid, title: form.title, pic_bda: form.pic_bda || null, pic_ops: form.pic_ops || null,
                    quoteref: form.quoteref || null, invoiceref: form.invoiceref || null,
                    status: action === 'request_process' ? 'Submitted' : (h.status || 'Draft'),
                    updated_at: now,
                    ...(action === 'request_process' ? { submitted_at: now } : {}),
                },
                orderplan_deliveries: deliveries,
                orderplan_attbookings: attbookings,
                orderplan_lines: lines,
            };
        }

        function handleSaveOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const payload = buildPayload('save_draft');
            pendingAction.value = 'save';
            emit('trigger-event', { name: 'onSaveOrderPlan', event: { value: payload } });
        }

        function handleSubmitOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const payload = buildPayload('request_process');
            pendingAction.value = 'submit';
            emit('trigger-event', { name: 'onSubmitOrderPlan', event: { value: payload } });
        }

        function handleDeleteOrderPlan() {
            /* wwEditor:start */ if (props.wwEditorState?.isEditing) return; /* wwEditor:end */
            const h = currentHeader.value;
            pendingAction.value = 'delete';
            emit('trigger-event', { name: 'onDeleteOrderPlan', event: { value: { headerId: h?.id || null, opid: h?.opid || null } } });
        }

        // ── Action tracking ──
        const pendingAction = ref(null);
        const actionFailed = ref(false);
        const actionFailedLabel = ref('');

        function handleRetry() { actionFailed.value = false; pendingAction.value = null; }

        watch(actionStatus, (newStatus) => {
            if (!pendingAction.value) return;
            if (newStatus === 'successful') {
                if (pendingAction.value === 'save' || pendingAction.value === 'submit') opEditMode.value = false;
                pendingAction.value = null; actionFailed.value = false;
            } else if (newStatus === 'failed') {
                actionFailedLabel.value = pendingAction.value === 'save' ? 'Save' : pendingAction.value === 'submit' ? 'Submit' : 'Delete';
                pendingAction.value = null; actionFailed.value = true;
            }
        });

        return {
            currentHeader, currentDeliveries, attachedBookings, resolvedTeammates,
            resolvedLines, linesForDelivery, isSplit, pipelineBatches, pipelineDeliveryGroups,
            activeView,
            getTeammateName, formatDate, statusKey, laborDisplay,
            handleStatusChange, handleSetBdNumber, handleSetDoLink,
            setBdRef, setDoRef, isEditing, startEditing, stopEditing,
            handleRetry, pendingAction, actionFailed, actionFailedLabel,
            // Order Plan Edit
            opEditMode, form, formDeliveries, formAttachedBookingIds, formAllocations,
            showBookingDropdown, bookingSearch, custOptions, labOptions,
            enterEditMode, cancelEditMode, addFormDelivery, removeFormDelivery,
            filteredBookingsForConnect, isBookingAttached, attachFormBooking, detachFormBooking,
            itemsForBooking, getAllocs, allocTotal, allocSummaryClass,
            updateAllocQty, updateAllocField, handleSplitAlloc, removeAllocRow,
            handleSaveOrderPlan, handleSubmitOrderPlan, handleDeleteOrderPlan,
            bookingHeaderLookup,
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

/* ═══ EMPTY ═══ */
.empty-state { display: flex; align-items: center; justify-content: center; padding: 80px 20px; }
.empty-text { font-size: 14px; color: $gray-500; margin: 0; }

/* ═══ FAILED TOAST ═══ */
.action-failed-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: $red-50; border-bottom: 1px solid rgba($red, 0.15); cursor: pointer; }
.failed-text { font-size: 12px; font-weight: 600; color: $red-dark; }
.failed-retry { font-size: 11px; color: $red; text-decoration: underline; margin-left: auto; }

/* ═══ HEADER BAR ═══ */
.header-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #1e293b; color: $white; }
.opid-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.12); padding: 3px 8px; font-family: 'SF Mono', 'Fira Code', monospace; }
.header-title { font-size: 14px; font-weight: 600; flex: 1; }
.header-status { font-size: 10px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.status--draft { background: $gray-100; color: $gray-600; }
.status--submitted { background: $blue-50; color: $blue; }

/* ═══ CONTENT ═══ */
.ops-content { display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; }
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

/* ═══ SHARED TABLE HELPERS ═══ */
.col-right { text-align: right; }
.cell-mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }
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
.ss--delivered { background-color: $green-50; color: $green; }

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
.edit-input--qty { width: 54px; text-align: center; }
.edit-select {
    padding: 4px 8px; border: 1px solid $gray-300; font-size: 11px; font-family: $font;
    color: $gray-900; background: $white; outline: none; width: 100%;
}
.edit-select--sm { width: auto; }
.edit-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.edit-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
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
    padding: 8px; max-height: 260px; overflow-y: auto;
}
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
.alloc-summary { font-size: 12px; font-weight: 700; margin-left: auto; font-family: 'SF Mono', 'Fira Code', monospace; }
.alloc-summary--full { color: $green; }
.alloc-summary--over { color: $red; }
.alloc-summary--partial { color: $gray-400; }
.alloc-table { font-size: 11px; }
.alloc-row--split td:first-child { border-left: 3px solid $blue; }
.alloc-actions { display: flex; gap: 4px; }

/* ═══ INLINE INPUT + CONFIRM BUTTON ═══ */
.input-with-btn { display: flex; align-items: center; gap: 3px; }
.inline-input {
    width: 72px; height: 26px; padding: 0 6px; border: 1px solid $gray-200;
    font-size: 11px; font-family: $font; color: $gray-900; background: $white; outline: none;
    transition: border-color 0.15s ease;
    &::placeholder { color: $gray-400; }
    &:focus { border-color: $blue; }
}
.inline-input--wide { width: 88px; }

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
.pipe-table tbody tr:first-child td { border-top: none; }
.cell-batch { vertical-align: middle; background: $gray-50; border-left: 1px solid $gray-200; }
.thumb-sm { width: 28px; height: 28px; object-fit: cover; display: block; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 700px) {
    .section { padding: 12px; }
    .header-bar { padding: 10px 12px; flex-wrap: wrap; }
    .meta-label { width: 100px; }
    .toggle-btn { padding: 8px 12px; font-size: 11px; }
    .edit-bar { flex-wrap: wrap; }
}
</style>
