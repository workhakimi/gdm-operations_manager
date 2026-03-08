<template>
    <div class="ops-manager">
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
            <div class="header-bar">
                <span class="opid-badge">{{ currentHeader.opid }}</span>
                <span class="header-title">{{ currentHeader.title }}</span>
                <span class="header-status" :class="'status--' + (currentHeader.status || '').toLowerCase()">{{ currentHeader.status || 'Draft' }}</span>
            </div>

            <!-- Section: Order Metadata -->
            <section class="section">
                <h3 class="section-heading">Order Metadata</h3>
                <table class="meta-table">
                    <tbody>
                        <tr><td class="meta-label">Title</td><td>{{ currentHeader.title || '-' }}</td></tr>
                        <tr><td class="meta-label">Quote Ref</td><td>{{ currentHeader.quoteref || '-' }}</td></tr>
                        <tr><td class="meta-label">Invoice Ref</td><td>{{ currentHeader.invoiceref || '-' }}</td></tr>
                        <tr><td class="meta-label">PIC (BDA)</td><td>{{ getTeammateName(currentHeader.pic_bda) || 'Not assigned' }}</td></tr>
                        <tr><td class="meta-label">PIC (OPS)</td><td>{{ getTeammateName(currentHeader.pic_ops) || 'Not assigned' }}</td></tr>
                        <tr><td class="meta-label">Status</td><td>{{ currentHeader.status || 'Draft' }}</td></tr>
                        <tr><td class="meta-label">Created</td><td>{{ formatDate(currentHeader.created_at) }}</td></tr>
                        <tr v-if="currentHeader.submitted_at"><td class="meta-label">Submitted</td><td>{{ formatDate(currentHeader.submitted_at) }}</td></tr>
                    </tbody>
                </table>
            </section>

            <!-- Section: Attached Bookings -->
            <section class="section">
                <h3 class="section-heading">Attached Bookings <span class="count-badge">{{ attachedBookings.length }}</span></h3>
                <div v-if="attachedBookings.length === 0" class="empty-section">No bookings attached to this order plan.</div>
                <table v-else class="data-table">
                    <thead>
                        <tr>
                            <th>Booking #</th>
                            <th>Title</th>
                            <th>PIC</th>
                            <th>Status</th>
                            <th class="col-right">SKUs</th>
                            <th class="col-right">Total Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="b in attachedBookings" :key="b.id">
                            <td class="cell-mono">{{ b.bookingnumber }}</td>
                            <td>{{ b.bookingtitle || '-' }}</td>
                            <td>{{ b._picName || '-' }}</td>
                            <td><span class="status-pill" :class="'pill--' + (b.status || 'booked').toLowerCase().replace(/\s+/g, '-')">{{ b.status || 'Booked' }}</span></td>
                            <td class="col-right">{{ b.unique_skus || 0 }}</td>
                            <td class="col-right">{{ b.total_quantity || 0 }}</td>
                        </tr>
                    </tbody>
                </table>
                <!-- Booking Items Detail (per attached booking) -->
                <div v-for="booking in attachedBookings" :key="'detail-' + booking.id" class="booking-detail-block">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>SKU</th>
                                <th>Model</th>
                                <th>Color</th>
                                <th class="col-right">Qty</th>
                                <th>Status</th>
                                <th class="col-right">Balance Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in booking._items" :key="item.id">
                                <td class="cell-img"><img v-if="item._inv?.imagelink" :src="item._inv.imagelink" class="thumb" /><span v-else class="thumb-empty">-</span></td>
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
                                <td class="col-right" :class="{ 'cell-neg': (item.balanceref ?? 0) < 0 }">{{ item.balanceref ?? '-' }}</td>
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

            <!-- ═══ ORDER PLAN VIEW ═══ -->
            <div v-if="activeView === 'orderplan'" class="view-content">
                <!-- Delivery Logistics -->
                <section class="section">
                    <h3 class="section-heading">Delivery Logistics <span class="count-badge">{{ currentDeliveries.length }}</span></h3>
                    <div v-if="currentDeliveries.length === 0" class="empty-section">No deliveries configured.</div>

                    <div v-for="(del, dIdx) in currentDeliveries" :key="del.id" class="delivery-block">
                        <h4 class="delivery-title">{{ dIdx + 1 }}. {{ del.label || 'Unnamed Location' }} <span class="delivery-type-tag">{{ del.deliverytype }}</span></h4>
                        <table class="meta-table">
                            <tbody>
                                <tr><td class="meta-label">Address</td><td>{{ del.address || '-' }}</td></tr>
                                <tr><td class="meta-label">Deadline</td><td>{{ formatDate(del.deadline) || '-' }}</td></tr>
                                <tr><td class="meta-label">Contact</td><td>{{ del.pic_name || '-' }} · {{ del.pic_phone || '-' }}</td></tr>
                                <tr v-if="del.remarks"><td class="meta-label">Remarks</td><td>{{ del.remarks }}</td></tr>
                            </tbody>
                        </table>

                        <!-- Lines allocated to this delivery -->
                        <div v-if="linesForDelivery(del.id).length > 0" class="delivery-lines">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Model</th>
                                        <th>Color</th>
                                        <th class="col-right">Qty</th>
                                        <th>Split</th>
                                        <th>Customization</th>
                                        <th>Labor</th>
                                        <th>Status</th>
                                        <th>Mockup</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="line in linesForDelivery(del.id)" :key="line.id">
                                        <td class="cell-img"><img v-if="line._inv?.imagelink" :src="line._inv.imagelink" class="thumb" /><span v-else class="thumb-empty">-</span></td>
                                        <td>{{ line._inv?.model || 'Unknown' }}</td>
                                        <td>{{ line._inv?.color || '-' }}</td>
                                        <td class="col-right cell-mono">{{ line.quantity_assigned }}/{{ line._bookingItem?.quantity || '?' }}</td>
                                        <td><span v-if="isSplit(line)" class="split-tag">Split</span><span v-else class="cell-muted">-</span></td>
                                        <td>{{ line.customization || 'None' }}</td>
                                        <td>{{ laborDisplay(line.labor) || 'None' }}</td>
                                        <td>
                                            <select class="status-select" :class="'ss--' + statusKey(line._bookingItem?.status)" :value="line._bookingItem?.status || 'Booked'" @change="handleStatusChange(line.bookingitems_headerid, $event.target.value)">
                                                <option value="Booked">Booked</option>
                                                <option value="Issue Raised">Issue Raised</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Delivered">Delivered</option>
                                            </select>
                                        </td>
                                        <td><a v-if="line.mockup_link" :href="line.mockup_link" target="_blank" class="link">Mockup</a><span v-else class="cell-muted">-</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="empty-section empty-section--sm">No items allocated to this delivery.</div>
                    </div>
                </section>

            </div>

            <!-- ═══ PIPELINE MANAGER VIEW ═══ -->
            <div v-if="activeView === 'pipeline'" class="view-content">
                <section class="section">
                    <h3 class="section-heading">Order Pipeline <span class="count-badge">{{ pipelineBatches.length }} batches</span></h3>
                    <div v-if="pipelineBatches.length === 0" class="empty-section">No order plan lines found. Create allocations in the Order Plan Manager first.</div>

                    <!-- Pipeline cards — one per delivery location -->
                    <div v-for="group in pipelineDeliveryGroups" :key="group.deliveries_headerid" class="pipe-card">
                        <!-- Delivery header -->
                        <div class="pipe-card-header">
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

                        <!-- Batches inside this delivery -->
                        <div v-for="batch in group.batches" :key="batch.key" class="pipe-batch">
                            <div class="pipe-batch-bar">
                                <div class="pipe-batch-field">
                                    <span class="pipe-batch-label">BD#</span>
                                    <div v-if="batch.bd_number && !isEditing('bd', batch.key)" class="field-display">
                                        <span class="field-value cell-mono">{{ batch.bd_number }}</span>
                                        <span v-if="batch.bdStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing BD#"></span>
                                        <span v-if="batch.bdStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting BD numbers"></span>
                                        <button type="button" class="btn-edit" @click="startEditing('bd', batch.key)" title="Edit BD#">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                    </div>
                                    <div v-else class="input-with-btn">
                                        <input type="text" class="inline-input" :ref="el => setBdRef(batch.key, el)" :value="batch.bd_number" placeholder="Enter BD#" />
                                        <button type="button" class="btn-confirm" @click="handleSetBdNumber(batch.key)" title="Save">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        </button>
                                        <button v-if="batch.bd_number" type="button" class="btn-cancel" @click="stopEditing('bd', batch.key)" title="Cancel">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="pipe-batch-field">
                                    <span class="pipe-batch-label">Customization</span>
                                    <span class="pipe-batch-val">{{ batch.customization || 'None' }}</span>
                                    <span v-for="l in batch.labors" :key="l" class="labor-tag">{{ l }}</span>
                                </div>
                                <div class="pipe-batch-field">
                                    <span class="pipe-batch-label">DO Folder</span>
                                    <div v-if="batch.do_folder && !isEditing('do', batch.key)" class="field-display">
                                        <a :href="batch.do_folder" target="_blank" class="field-value link">Open Link</a>
                                        <span v-if="batch.doStatus === 'missing'" class="status-dot status-dot--warn" title="Some lines missing DO link"></span>
                                        <span v-if="batch.doStatus === 'conflict'" class="status-dot status-dot--error" title="Conflicting DO links"></span>
                                        <button type="button" class="btn-edit" @click="startEditing('do', batch.key)" title="Edit DO Link">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                    </div>
                                    <div v-else class="input-with-btn">
                                        <input type="text" class="inline-input inline-input--wide" :ref="el => setDoRef(batch.key, el)" :value="batch.do_folder" placeholder="Paste link" />
                                        <button type="button" class="btn-confirm" @click="handleSetDoLink(batch.key)" title="Save">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        </button>
                                        <button v-if="batch.do_folder" type="button" class="btn-cancel" @click="stopEditing('do', batch.key)" title="Cancel">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- Items table -->
                            <table class="pipe-items-table">
                                <thead>
                                    <tr>
                                        <th class="pit-img"></th>
                                        <th>Model</th>
                                        <th>Color</th>
                                        <th class="col-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in batch.items" :key="item.lineId">
                                        <td class="cell-img"><img v-if="item.imagelink" :src="item.imagelink" class="thumb" /><span v-else class="thumb-empty">-</span></td>
                                        <td>{{ item.model }}</td>
                                        <td>{{ item.color }}</td>
                                        <td class="col-right cell-mono">{{ item.qtyDisplay }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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
                const items = (bookingItemsByHeader.value[bh.id] || []).map(item => ({
                    ...item,
                    _inv: inventoryLookup.value[item.sku] || null,
                }));
                const pic = bh.pic_id ? teammateLookup.value[bh.pic_id] : null;
                return { ...bh, _items: items, _picName: pic?.name || '' };
            }).filter(Boolean);
        });

        // ── Lines resolved with inventory & delivery data ──
        const resolvedLines = computed(() => {
            return currentLines.value.map(line => {
                const bi = bookingItemLookup.value[line.bookingitems_headerid];
                const inv = bi ? inventoryLookup.value[bi.sku] : null;
                const del = deliveryLookup.value[line.deliveries_headerid];
                return {
                    ...line,
                    _bookingItem: bi || null,
                    _inv: inv || null,
                    _delivery: del || null,
                };
            });
        });

        // Count lines per splitgroupid — only "split" when >1 line shares the same group
        const splitGroupCounts = computed(() => {
            const m = {};
            for (const l of currentLines.value) {
                if (l.splitgroupid) m[l.splitgroupid] = (m[l.splitgroupid] || 0) + 1;
            }
            return m;
        });

        function isSplit(line) {
            return line.splitgroupid && (splitGroupCounts.value[line.splitgroupid] || 0) > 1;
        }

        function linesForDelivery(deliveryId) {
            return resolvedLines.value.filter(l => l.deliveries_headerid === deliveryId);
        }

        // ── Field consistency check ──
        // Returns: 'ok' (all same non-empty), 'empty' (all empty), 'missing' (some empty), 'conflict' (different values)
        function getFieldStatus(values) {
            const nonEmpty = values.filter(v => v);
            if (nonEmpty.length === 0) return 'empty';
            const unique = new Set(nonEmpty);
            if (unique.size > 1) return 'conflict';
            if (nonEmpty.length < values.length) return 'missing';
            return 'ok';
        }

        // ── Pipeline batches (grouped by delivery + customization) ──
        // One BD# per customization type per delivery address
        const pipelineBatches = computed(() => {
            const batchMap = {};
            for (const line of resolvedLines.value) {
                const key = `${line.deliveries_headerid}::${line.customization || 'None'}`;
                if (!batchMap[key]) {
                    batchMap[key] = {
                        key,
                        deliveries_headerid: line.deliveries_headerid,
                        customization: line.customization || 'None',
                        deliveryLabel: line._delivery?.label || 'Unknown',
                        delivery: line._delivery || null,
                        bd_number: '',
                        do_folder: '',
                        labors: [],
                        items: [],
                        _laborSet: new Set(),
                        _bdNumbers: [],
                        _doFolders: [],
                    };
                }
                const batch = batchMap[key];
                // Track all bd_numbers and do_folders for consistency checks
                batch._bdNumbers.push(line.bd_number || '');
                batch._doFolders.push(line.do_folder || '');
                // Use bd_number and do_folder from first line that has them
                if (!batch.bd_number && line.bd_number) {
                    batch.bd_number = line.bd_number;
                }
                if (!batch.do_folder && line.do_folder) {
                    batch.do_folder = line.do_folder;
                }
                // Collect unique labor types across items in batch
                if (line.labor) {
                    const label = laborDisplay(line.labor);
                    if (label && !batch._laborSet.has(label)) {
                        batch._laborSet.add(label);
                        batch.labors.push(label);
                    }
                }
                batch.items.push({
                    lineId: line.id,
                    imagelink: line._inv?.imagelink || '',
                    model: line._inv?.model || 'Unknown',
                    color: line._inv?.color || '-',
                    qtyDisplay: `${line.quantity_assigned || 0}/${line._bookingItem?.quantity || '?'}`,
                });
            }
            // Compute consistency status for bd_number and do_folder per batch
            const batches = Object.values(batchMap);
            for (const batch of batches) {
                batch.bdStatus = getFieldStatus(batch._bdNumbers);
                batch.doStatus = getFieldStatus(batch._doFolders);
            }
            return batches;
        });

        // ── Delivery groups: merge delivery column across batches sharing same delivery ──
        const pipelineDeliveryGroups = computed(() => {
            const groups = [];
            const groupMap = {};
            for (const batch of pipelineBatches.value) {
                const dId = batch.deliveries_headerid || '_none';
                if (!groupMap[dId]) {
                    groupMap[dId] = { deliveries_headerid: dId, delivery: batch.delivery, deliveryLabel: batch.deliveryLabel, batches: [], totalItems: 0 };
                    groups.push(groupMap[dId]);
                }
                groupMap[dId].batches.push(batch);
                groupMap[dId].totalItems += batch.items.length;
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
            let hours = d.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
        }

        function statusKey(status) {
            if (!status) return 'booked';
            return status.toLowerCase().replace(/\s+/g, '-');
        }

        function laborDisplay(val) {
            if (!val) return '';
            if (Array.isArray(val)) return val.map(v => LABOR_LABELS[v] || v).filter(Boolean).join(', ');
            return LABOR_LABELS[val] || val || '';
        }

        // ── Event handlers ──
        function handleStatusChange(bookingItemId, newStatus) {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            emit('trigger-event', {
                name: 'onUpdateItemStatus',
                event: { value: { booking_item_id: bookingItemId, new_status: newStatus } },
            });
        }

        // ── Input refs for BD# and DO Link per batch ──
        const bdRefs = {};
        const doRefs = {};
        function setBdRef(key, el) { if (el) bdRefs[key] = el; }
        function setDoRef(key, el) { if (el) doRefs[key] = el; }

        // ── Editing state for fields with existing values ──
        const editingFields = reactive({});
        function isEditing(field, key) { return !!editingFields[`${field}::${key}`]; }
        function startEditing(field, key) { editingFields[`${field}::${key}`] = true; }
        function stopEditing(field, key) { delete editingFields[`${field}::${key}`]; }

        function handleSetBdNumber(batchKey) {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey);
            if (!batch) return;
            const inputEl = bdRefs[batchKey];
            const value = inputEl?.value || '';
            emit('trigger-event', {
                name: 'onSetBdNumber',
                event: { value: { batch_key: batchKey, line_ids: batch.items.map(i => i.lineId), bd_number: value } },
            });
            stopEditing('bd', batchKey);
        }

        function handleSetDoLink(batchKey) {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            const batch = pipelineBatches.value.find(b => b.key === batchKey);
            if (!batch) return;
            const inputEl = doRefs[batchKey];
            const value = inputEl?.value || '';
            emit('trigger-event', {
                name: 'onSetDoLink',
                event: { value: { batch_key: batchKey, line_ids: batch.items.map(i => i.lineId), do_folder: value } },
            });
            stopEditing('do', batchKey);
        }

        // ── Action tracking ──
        const pendingAction = ref(null);
        const actionFailed = ref(false);
        const actionFailedLabel = ref('');

        function handleRetry() {
            actionFailed.value = false;
            pendingAction.value = null;
        }

        watch(actionStatus, (newStatus) => {
            if (!pendingAction.value) return;
            if (newStatus === 'successful') {
                pendingAction.value = null;
                actionFailed.value = false;
            } else if (newStatus === 'failed') {
                actionFailedLabel.value = 'Action';
                pendingAction.value = null;
                actionFailed.value = true;
            }
        });

        return {
            currentHeader, currentDeliveries, attachedBookings,
            resolvedLines, linesForDelivery, isSplit, pipelineBatches, pipelineDeliveryGroups,
            activeView,
            getTeammateName, formatDate, statusKey, laborDisplay,
            handleStatusChange, handleSetBdNumber, handleSetDoLink,
            setBdRef, setDoRef, isEditing, startEditing, stopEditing,
            handleRetry, pendingAction, actionFailed, actionFailedLabel,
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
.opid-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace; }
.header-title { font-size: 14px; font-weight: 600; flex: 1; }
.header-status { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.status--draft { background: $gray-100; color: $gray-600; }
.status--submitted { background: $blue-50; color: $blue; }

/* ═══ CONTENT ═══ */
.ops-content { display: flex; flex-direction: column; width: 100%; max-width: 1200px; margin: 0 auto; }
.view-content { display: flex; flex-direction: column; gap: 0; }

/* ═══ SECTIONS ═══ */
.section { padding: 16px; }
.section-heading { font-size: 11px; font-weight: 700; color: $gray-500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px; }
.count-badge { font-size: 10px; font-weight: 700; background: $gray-200; color: $gray-600; padding: 1px 6px; border-radius: 8px; }
.empty-section { padding: 24px; text-align: center; color: $gray-500; font-size: 12px; border: 1px dashed $gray-300; border-radius: 6px; background: $white; }
.empty-section--sm { padding: 12px; font-size: 11px; margin-top: 8px; }

/* ═══ META TABLE ═══ */
.meta-table {
    width: 100%; border-collapse: collapse; background: $white; border: 1px solid $gray-200; border-radius: 6px; overflow: hidden;
    td { padding: 8px 12px; border-bottom: 1px solid $gray-100; font-size: 12px; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
}
.meta-label { font-weight: 700; color: $gray-500; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; width: 140px; white-space: nowrap; }

/* ═══ DATA TABLE ═══ */
.data-table {
    width: 100%; border-collapse: collapse; background: $white; border: 1px solid $gray-200; border-radius: 6px; overflow: hidden;
    th { padding: 8px 10px; font-size: 10px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid $gray-200; text-align: left; background: $gray-50; }
    td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid $gray-50; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: $gray-50; }
}
.col-right { text-align: right; }
.cell-mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; }
.cell-muted { color: $gray-400; }
.cell-neg { color: $red; font-weight: 700; }
.cell-img { width: 40px; padding: 4px 8px; }
.thumb { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; display: block; }
.thumb-empty { color: $gray-400; }

/* ═══ STATUS ═══ */
.status-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.pill--booked { background: $blue-50; color: $blue; }
.pill--issue-raised { background: $red-50; color: $red; }
.pill--processing { background: $amber-50; color: $amber; }
.pill--delivered { background: $green-50; color: $green; }

.status-select {
    appearance: none; -webkit-appearance: none; padding: 3px 18px 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; font-family: $font; border: 1px solid transparent; cursor: pointer; outline: none;
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

/* ═══ DELIVERY BLOCK ═══ */
.delivery-block { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid $gray-200; &:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; } }
.delivery-title { font-size: 13px; font-weight: 700; color: $gray-900; margin: 0 0 8px 0; }
.delivery-type-tag { font-size: 10px; font-weight: 600; color: $gray-500; background: $gray-100; padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
.delivery-lines { margin-top: 10px; }

/* ═══ BOOKING DETAIL ═══ */
.booking-detail-block { margin-bottom: 16px; }
.booking-detail-title { font-size: 12px; font-weight: 700; color: $gray-700; margin: 0 0 8px 0; }

/* ═══ INLINE INPUT + CONFIRM BUTTON ═══ */
.input-with-btn { display: flex; align-items: center; gap: 3px; }
.inline-input {
    width: 90px; height: 30px; padding: 0 8px; border: 1px solid $gray-200; border-radius: 5px;
    font-size: 11px; font-family: $font; color: $gray-900; background: $white; outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    &::placeholder { color: $gray-400; }
    &:focus { border-color: $blue; box-shadow: 0 0 0 2px rgba($blue, 0.1); }
}
.inline-input--wide { width: 110px; }

/* ═══ FIELD DISPLAY (read-only with edit button) ═══ */
.field-display { display: flex; align-items: center; gap: 5px; }
.field-value { font-size: 11px; color: $gray-900; }
.btn-edit {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border: none; border-radius: 4px;
    background: transparent; color: $gray-400; cursor: pointer; transition: all 0.15s ease;
    svg { width: 12px; height: 12px; }
    &:hover { background: $blue-50; color: $blue; }
}
.btn-cancel {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; padding: 0; border: none; border-radius: 5px;
    background: $gray-100; color: $gray-500; cursor: pointer; transition: all 0.15s ease;
    svg { width: 13px; height: 13px; }
    &:hover { background: $red-50; color: $red; }
}
.btn-confirm {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; padding: 0; border: none; border-radius: 5px;
    background: #1e293b; color: $white; cursor: pointer; transition: background 0.15s ease;
    svg { width: 13px; height: 13px; }
    &:hover { background: #334155; }
}

/* ═══ STATUS DOT (field consistency indicator) ═══ */
.status-dot {
    display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; cursor: help; position: relative;
}
.status-dot--warn { background: $amber; }
.status-dot--error { background: $red; }

/* ═══ SPLIT TAG ═══ */
.split-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #7c3aed; background: #f5f3ff; padding: 1px 5px; border-radius: 4px; }

/* ═══ LABOR TAG ═══ */
.labor-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #0d9488; background: #f0fdfa; padding: 1px 5px; border-radius: 4px; margin-left: 4px; }

/* ═══ LINK ═══ */
.link { color: $blue; font-size: 11px; text-decoration: none; &:hover { text-decoration: underline; } }

/* ═══ PIPELINE CARDS ═══ */
.pipe-card {
    border: 1px solid $gray-200; border-radius: 8px; overflow: hidden;
    margin-bottom: 12px; background: $white;
}
.pipe-card-header {
    background: #1e293b; color: $white; padding: 12px 16px;
}
.pipe-card-header-main { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.pipe-card-title { font-size: 13px; font-weight: 700; }
.pipe-dtype-tag {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    background: rgba(255,255,255,0.12); padding: 2px 7px; border-radius: 3px; color: rgba(255,255,255,0.7);
}
.pipe-card-meta { font-size: 11px; color: rgba(255,255,255,0.6); line-height: 1.4; }
.pipe-card-meta-row { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
.pipe-card-deadline { font-size: 11px; font-weight: 600; color: #fbbf24; }
.pipe-card-contact { font-size: 11px; color: rgba(255,255,255,0.5); }
.pipe-card-remarks { font-size: 10px; color: rgba(255,255,255,0.35); font-style: italic; margin-top: 4px; }

/* Batch inside a card */
.pipe-batch { border-top: 1px solid $gray-200; }
.pipe-batch:first-child { border-top: none; }
.pipe-batch-bar {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    padding: 10px 16px; background: $gray-50; border-bottom: 1px solid $gray-100;
}
.pipe-batch-field { display: flex; align-items: center; gap: 6px; }
.pipe-batch-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: $gray-400; white-space: nowrap;
}
.pipe-batch-val { font-size: 12px; color: $gray-700; font-weight: 500; }

/* Items table inside batch */
.pipe-items-table {
    width: 100%; border-collapse: collapse;
    th { padding: 6px 16px; font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; text-align: left; border-bottom: 1px solid $gray-100; background: $white; }
    td { padding: 8px 16px; font-size: 12px; border-bottom: 1px solid $gray-50; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
}
.pit-img { width: 44px; }
.batch-labors { display: flex; flex-wrap: wrap; gap: 3px; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 700px) {
    .section { padding: 12px; }
    .header-bar { padding: 10px 12px; flex-wrap: wrap; }
    .meta-label { width: 100px; }
    .toggle-btn { padding: 8px 12px; font-size: 11px; }
}
@media (max-width: 480px) {
    .meta-table td { padding: 6px 8px; }
    .data-table th, .data-table td { padding: 6px 8px; font-size: 11px; }
}
</style>
