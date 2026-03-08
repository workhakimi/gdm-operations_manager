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

                <!-- Booking Items Detail -->
                <section class="section">
                    <h3 class="section-heading">Booking Items Detail</h3>
                    <div v-for="booking in attachedBookings" :key="'detail-' + booking.id" class="booking-detail-block">
                        <h4 class="booking-detail-title">{{ booking.bookingnumber }} — {{ booking.bookingtitle }}</h4>
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
            </div>

            <!-- ═══ PIPELINE MANAGER VIEW ═══ -->
            <div v-if="activeView === 'pipeline'" class="view-content">
                <section class="section">
                    <h3 class="section-heading">Order Pipeline <span class="count-badge">{{ pipelineBatches.length }} batches</span></h3>
                    <div v-if="pipelineBatches.length === 0" class="empty-section">No order plan lines found. Create allocations in the Order Plan Manager first.</div>
                    <div v-else class="table-scroll">
                        <table class="data-table pipeline-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Model</th>
                                    <th>Color</th>
                                    <th class="col-right">qty</th>
                                    <th>BD#</th>
                                    <th>Customization &amp; Labor</th>
                                    <th>Documentation</th>
                                    <th>Delivery Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-for="batch in pipelineBatches" :key="batch.key">
                                    <tr v-for="(item, itemIdx) in batch.items" :key="item.lineId" :class="{ 'batch-first-row': itemIdx === 0, 'batch-last-row': itemIdx === batch.items.length - 1 }">
                                        <td class="cell-img"><img v-if="item.imagelink" :src="item.imagelink" class="thumb" /><span v-else class="thumb-empty">-</span></td>
                                        <td>{{ item.model }}</td>
                                        <td>{{ item.color }}</td>
                                        <td class="col-right cell-mono">{{ item.qtyDisplay }}</td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-merged">
                                            <div class="input-with-btn">
                                                <input type="text" class="inline-input" :ref="el => setBdRef(batch.key, el)" :value="batch.bd_number" placeholder="BD#" />
                                                <button type="button" class="btn-confirm" @click="handleSetBdNumber(batch.key)" title="Set BD#">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-merged">
                                            <span>{{ batch.customization || 'None' }}</span>
                                            <div v-if="batch.labors.length" class="batch-labors">
                                                <span v-for="l in batch.labors" :key="l" class="labor-tag">+ {{ l }}</span>
                                            </div>
                                        </td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-merged">
                                            <div class="input-with-btn">
                                                <input type="text" class="inline-input inline-input--wide" :ref="el => setDoRef(batch.key, el)" :value="batch.do_link" placeholder="DO Link" />
                                                <button type="button" class="btn-confirm" @click="handleSetDoLink(batch.key)" title="Set DO Link">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                        <td v-if="itemIdx === 0" :rowspan="batch.items.length" class="cell-merged">
                                            {{ batch.deliveryLabel }}
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
import { ref, computed, watch } from 'vue';

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

        function linesForDelivery(deliveryId) {
            return resolvedLines.value.filter(l => l.deliveries_headerid === deliveryId);
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
                        bd_number: '',
                        do_link: '',
                        labors: [],
                        items: [],
                        _laborSet: new Set(),
                    };
                }
                const batch = batchMap[key];
                // Collect first available mockup_link as default do_link
                if (!batch.do_link && line.mockup_link) {
                    batch.do_link = line.mockup_link;
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
            return Object.values(batchMap);
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
                event: { value: { batch_key: batchKey, line_ids: batch.items.map(i => i.lineId), do_link: value } },
            });
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
            resolvedLines, linesForDelivery, pipelineBatches,
            activeView,
            getTeammateName, formatDate, statusKey, laborDisplay,
            handleStatusChange, handleSetBdNumber, handleSetDoLink,
            setBdRef, setDoRef,
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
.thumb { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; border: 1px solid $gray-200; display: block; }
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
.input-with-btn { display: flex; align-items: center; gap: 4px; }
.inline-input {
    width: 80px; height: 28px; padding: 0 6px; border: 1px solid $gray-200; border-radius: 4px;
    font-size: 11px; font-family: $font; color: $gray-900; background: $white; outline: none;
    &::placeholder { color: $gray-400; } &:focus { border-color: $blue; }
}
.inline-input--wide { width: 100px; }
.btn-confirm {
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; padding: 0; border: none; border-radius: 4px;
    background: $blue; color: $white; cursor: pointer; transition: background 0.15s ease;
    svg { width: 14px; height: 14px; }
    &:hover { background: $blue-dark; }
}

/* ═══ LABOR TAG ═══ */
.labor-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #0d9488; background: #f0fdfa; padding: 1px 5px; border-radius: 4px; margin-left: 4px; }

/* ═══ LINK ═══ */
.link { color: $blue; font-size: 11px; text-decoration: none; &:hover { text-decoration: underline; } }

/* ═══ TABLE SCROLL ═══ */
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.pipeline-table { min-width: 700px; }

/* ═══ PIPELINE BATCH ROWS ═══ */
.batch-first-row td { border-top: 2px solid $gray-400; }
.batch-last-row td { border-bottom: 2px solid $gray-400; }
.cell-merged { vertical-align: middle; border-left: 2px solid $gray-400; background: $gray-50; }
.batch-labors { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }

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
