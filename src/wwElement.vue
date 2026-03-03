<template>
    <div class="ops-manager">
        <!-- ═══════════ EMPTY STATE ═══════════ -->
        <div v-if="!currentHeader" class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <p class="empty-text">Select an order plan to view operations.</p>
        </div>

        <!-- ═══════════ REVIEW MODE ═══════════ -->
        <div v-else-if="!hasPipeline" class="review-mode">
            <!-- Failed toast -->
            <div v-if="actionFailed" class="action-failed-bar" @click="handleRetry">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span class="failed-text">{{ actionFailedLabel }} failed.</span>
                <span class="failed-retry">Click to try again</span>
            </div>

            <div class="review-content">
                <!-- ── SECTION A: ATTACHED BOOKINGS ── -->
                <section class="review-section">
                    <h3 class="section-heading">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        Attached Bookings
                    </h3>

                    <div v-if="attachedBookings.length === 0" class="bookings-empty">
                        <p class="bookings-empty-text">No bookings attached to this order plan.</p>
                    </div>

                    <div v-for="booking in attachedBookings" :key="booking.id" class="booking-block">
                        <div class="booking-header">
                            <div class="booking-header-info">
                                <div class="booking-header-top">
                                    <span class="booking-bn">{{ booking.bookingnumber }}</span>
                                    <span class="booking-status-pill" :class="'pill--' + (booking.status || 'Booked').toLowerCase().replace(/\s+/g, '-')">{{ booking.status || 'Booked' }}</span>
                                </div>
                                <div class="booking-title">{{ booking.bookingtitle }}</div>
                                <div class="booking-subtitle">{{ booking._pic?.name || '' }}<template v-if="booking._pic?.name"> · </template>{{ formatDate(booking.created_at) }}</div>
                                <div class="booking-stats">{{ booking.unique_skus || 0 }} Unique SKUs · {{ booking.total_quantity || 0 }} Total Qty</div>
                            </div>
                            <button type="button" class="btn-dots">
                                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                            </button>
                        </div>

                        <div class="booking-items">
                            <div class="items-header">
                                <span class="ih ih-product">PRODUCT</span>
                                <span class="ih ih-sku">SKU</span>
                                <span class="ih ih-avail">AVAIL</span>
                                <span class="ih ih-status">STATUS</span>
                                <span class="ih ih-qty">QTY</span>
                                <span class="ih ih-action"></span>
                            </div>
                            <div v-for="item in booking._items" :key="item.id" class="item-row">
                                <div class="item-product">
                                    <img v-if="item._inv?.imagelink" :src="item._inv.imagelink" :alt="item._inv?.model" class="item-thumb" />
                                    <div v-else class="item-thumb-placeholder">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                                    </div>
                                    <div class="item-product-text">
                                        <div class="item-model">{{ item._inv?.model || 'Unknown Item' }}</div>
                                        <div class="item-variant">{{ item._inv?.color || '' }}{{ item._inv?.color && item._inv?.size ? ' · ' : '' }}{{ item._inv?.size || '' }}</div>
                                    </div>
                                </div>
                                <div class="item-sku">{{ item.sku }}</div>
                                <div class="item-avail" :class="{ 'avail-neg': (item.balanceref ?? 0) < 0, 'avail-pos': (item.balanceref ?? 0) >= 0 }">{{ item.balanceref ?? '-' }}</div>
                                <div class="item-status-cell">
                                    <select class="status-select" :class="'ss--' + statusKey(item.status)" :value="item.status" @change="handleStatusChange(item.id, $event.target.value)">
                                        <option value="Booked">Booked</option>
                                        <option value="Issue Raised">Issue Raised</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Delivered">Delivered</option>
                                    </select>
                                </div>
                                <div class="item-qty">{{ item.quantity }}</div>
                                <div class="item-action">
                                    <button type="button" class="btn-dots btn-dots--sm">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ── SECTION B: ORDER METADATA ── -->
                <section class="review-section">
                    <h3 class="section-heading">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Order Metadata
                    </h3>
                    <div class="meta-card">
                        <div class="meta-grid">
                            <div class="meta-field meta-field--full">
                                <label class="field-label">ORDER PLAN TITLE</label>
                                <div class="meta-value-box">{{ currentHeader.title || '-' }}</div>
                            </div>
                            <div class="meta-field">
                                <label class="field-label">QUOTE REFERENCE</label>
                                <div class="meta-value-box">{{ currentHeader.quoteref || '-' }}</div>
                            </div>
                            <div class="meta-field">
                                <label class="field-label">INVOICE REFERENCE</label>
                                <div class="meta-value-box">{{ currentHeader.invoiceref || '-' }}</div>
                            </div>
                            <div class="meta-field">
                                <label class="field-label">PIC (BDA)</label>
                                <div class="meta-value-box meta-value-box--select">
                                    <span>{{ getTeammateName(currentHeader.pic_bda) || 'Not assigned' }}</span>
                                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                            <div class="meta-field">
                                <label class="field-label">PIC (OPS)</label>
                                <div class="meta-value-box meta-value-box--select">
                                    <span>{{ getTeammateName(currentHeader.pic_ops) || 'Not assigned' }}</span>
                                    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ── SECTION B2: DELIVERY LOGISTICS ── -->
                <section class="review-section">
                    <h3 class="section-heading">
                        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        Delivery Logistics
                    </h3>
                    <div class="deliveries-grid">
                        <div v-for="(del, dIdx) in currentDeliveries" :key="del.id" class="delivery-card">
                            <div class="delivery-card-header">
                                <div class="delivery-index">{{ dIdx + 1 }}</div>
                                <span class="delivery-label-text">{{ del.label || 'Unnamed Location' }}</span>
                            </div>
                            <div class="delivery-fields">
                                <div class="delivery-row-2col">
                                    <div class="delivery-field">
                                        <label class="field-label-sm">TYPE</label>
                                        <div class="delivery-val-box">{{ del.deliverytype || '-' }}</div>
                                    </div>
                                    <div class="delivery-field">
                                        <label class="field-label-sm">DEADLINE</label>
                                        <div class="delivery-val-box">{{ formatDeadline(del.deadline) || '-' }}</div>
                                    </div>
                                </div>
                                <div class="delivery-field">
                                    <label class="field-label-sm">ADDRESS</label>
                                    <div class="delivery-val-box delivery-val-box--tall">{{ del.address || '-' }}</div>
                                </div>
                                <div class="delivery-field">
                                    <label class="field-label-sm">REMARKS</label>
                                    <div class="delivery-val-box delivery-val-box--muted">{{ del.remarks || 'Optional notes...' }}</div>
                                </div>
                                <div class="delivery-row-2col">
                                    <div class="delivery-field">
                                        <label class="field-label-sm">CONTACT NAME</label>
                                        <div class="delivery-val-box">{{ del.pic_name || '-' }}</div>
                                    </div>
                                    <div class="delivery-field">
                                        <label class="field-label-sm">CONTACT PHONE</label>
                                        <div class="delivery-val-box">{{ del.pic_phone || '-' }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ── SECTION C: CREATE PIPELINE BUTTON ── -->
                <div class="create-pipeline-wrap">
                    <button type="button" class="btn-create-pipeline" :class="{ 'btn--attempting': pendingAction === 'create' }" :disabled="isAttempting" @click="handleCreatePipeline">
                        <span v-if="pendingAction === 'create'" class="spinner"></span>
                        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                        {{ pendingAction === 'create' ? 'Creating Pipeline...' : 'Create Order Pipeline' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ═══════════ PIPELINE MODE ═══════════ -->
        <div v-else class="pipeline-mode">
            <!-- Failed toast -->
            <div v-if="actionFailed" class="action-failed-bar" @click="handleRetry">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span class="failed-text">{{ actionFailedLabel }} failed.</span>
                <span class="failed-retry">Click to try again</span>
            </div>

            <!-- Header Bar -->
            <div class="pipeline-header-bar">
                <span class="opid-badge">{{ localPipeline?.opid }}</span>
                <span class="pipeline-title-text">{{ localPipeline?.title }}</span>
            </div>

            <!-- Column Headers -->
            <div class="pipeline-col-headers">
                <div class="col-headers-main">
                    <span class="col-h" style="flex: 0 0 25%;">ALLOCATED ITEMS</span>
                    <span class="col-h" style="flex: 1;">BATCH ASSIGNMENT</span>
                    <span class="col-h" style="flex: 1;">CUSTOMIZATION &amp; LABOR</span>
                    <span class="col-h" style="flex: 1;">DOCUMENTATION</span>
                </div>
                <div class="col-headers-dest">
                    <span class="col-h">FINAL DESTINATION</span>
                </div>
            </div>

            <!-- Pipeline Body -->
            <div class="pipeline-body">
                <div v-for="(dest, dIdx) in localPipeline?.destinations || []" :key="dIdx" class="dest-group">
                    <!-- Pipeline Content Area -->
                    <div class="dest-content">
                        <div v-for="(batch, bIdx) in dest.batches" :key="batch.batch_id" class="batch-row" :class="{ 'batch-row--border': bIdx < dest.batches.length - 1 }">
                            <!-- Col 1: Allocated Items -->
                            <div class="cell-allocated">
                                <span class="batch-type-badge">BATCH: {{ (batch.customization || 'NONE').toUpperCase() }}</span>
                                <div v-for="item in batch.items" :key="item.line_id" class="p-item">
                                    <div class="p-item-info">
                                        <div class="p-item-name">{{ item.product_name }}</div>
                                        <div class="p-item-sku">{{ item.sku }}</div>
                                    </div>
                                    <div class="p-item-qty">
                                        <span class="pq-num" :class="{ 'pq-full': item.quantity_allocated >= item.quantity_total }">{{ item.quantity_allocated }}</span><span class="pq-total">/ {{ item.quantity_total }}</span>
                                        <span class="pq-label">ALLOCATED</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Col 2: Batch Assignment -->
                            <div class="cell-batch">
                                <span class="cell-label">BATCH DOCUMENT</span>
                                <input type="text" class="bd-input" v-model="batch.bd_number" placeholder="Enter BD #..." @change="handleBdChange" />
                            </div>

                            <!-- Arrow 1 -->
                            <div class="flow-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </div>

                            <!-- Col 3: Customization & Labor -->
                            <div class="cell-cust">
                                <svg class="cust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <div class="cust-text">
                                    <span class="cust-name">{{ batch.customization }}</span>
                                    <span v-if="batch.labor" class="cust-labor">+ {{ laborDisplay(batch.labor) }}</span>
                                </div>
                            </div>

                            <!-- Arrow 2 -->
                            <div class="flow-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </div>

                            <!-- Col 4: Documentation -->
                            <div class="cell-doc">
                                <div class="doc-card-node">
                                    <svg class="doc-node-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                    <span class="doc-node-title">Client DO</span>
                                    <span class="doc-node-sub">{{ batch.customization }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Col 5: Destination Sidebar -->
                    <div class="dest-sidebar">
                        <div class="dest-card">
                            <div class="dest-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                            <h4 class="dest-card-name">{{ dest.label }}</h4>

                            <div class="dest-detail">
                                <svg class="dest-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span class="dest-detail-text">{{ dest.address }}</span>
                            </div>

                            <div class="dest-detail">
                                <svg class="dest-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                <div>
                                    <span class="dest-detail-label">DEADLINE</span>
                                    <span class="dest-detail-value">{{ formatDeadline(dest.deadline) }}</span>
                                </div>
                            </div>

                            <div class="dest-detail">
                                <svg class="dest-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <div>
                                    <span class="dest-detail-label">RECIPIENT</span>
                                    <span class="dest-detail-value">{{ dest.recipient_name }}<br/>· {{ dest.recipient_phone }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

function generateUid() {
    try { return wwLib.wwUtils.getUid(); }
    catch { return 'uid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
}

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
        const resolvedPipelineData = computed(() => wwLib.wwUtils.getDataFromCollection(props.content?.opsPipelineData) || []);
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
        const bookingItemsByHeader = computed(() => { const m = {}; for (const i of resolvedBookingItems.value) { if (!m[i.headerid]) m[i.headerid] = []; m[i.headerid].push(i); } return m; });
        const bookingItemLookup = computed(() => { const m = {}; for (const i of resolvedBookingItems.value) m[i.id] = i; return m; });

        // ── Current order plan data ──
        const currentHeader = computed(() => resolvedOpHeaders.value.find(h => h.id === selectedId.value) || null);
        const currentDeliveries = computed(() => resolvedOpDeliveries.value.filter(d => d.headerid === selectedId.value));
        const currentAttBookings = computed(() => resolvedOpAttBookings.value.filter(ab => ab.headerid === selectedId.value));
        const currentLines = computed(() => resolvedOpLines.value.filter(l => l.headerid === selectedId.value));

        // ── Pipeline detection ──
        const currentPipeline = computed(() => resolvedPipelineData.value.find(p => p.orderplan_headers_id === selectedId.value) || null);
        const hasPipeline = computed(() => !!currentPipeline.value);
        const pipelineStructure = computed(() => {
            if (!currentPipeline.value?.structure_data) return null;
            const sd = currentPipeline.value.structure_data;
            return typeof sd === 'string' ? JSON.parse(sd) : sd;
        });

        // ── Local pipeline copy for BD editing ──
        const localPipeline = ref(null);
        const lastSyncedPipelineId = ref(null);

        watch(() => currentPipeline.value?.id, (newId, oldId) => {
            if (newId && newId !== oldId) {
                const structure = pipelineStructure.value;
                if (structure) {
                    lastSyncedPipelineId.value = newId;
                    localPipeline.value = JSON.parse(JSON.stringify(structure));
                }
            } else if (!newId) {
                localPipeline.value = null;
                lastSyncedPipelineId.value = null;
            }
        }, { immediate: true });

        // ── Attached bookings for review mode ──
        const attachedBookings = computed(() => {
            return currentAttBookings.value.map(ab => {
                const bh = bookingHeaderLookup.value[ab.booking_headerid];
                if (!bh) return null;
                const items = (bookingItemsByHeader.value[bh.id] || []).map(item => {
                    const inv = inventoryLookup.value[item.sku];
                    return { ...item, _inv: inv || null };
                });
                const pic = bh.pic_id ? teammateLookup.value[bh.pic_id] : null;
                return { ...bh, _items: items, _pic: pic };
            }).filter(Boolean);
        });

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
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${String(d.getMinutes()).padStart(2, '0')}${ampm}`;
        }

        function formatDeadline(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let hours = d.getHours();
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12 || 12;
            return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} ${String(hours).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
        }

        function statusKey(status) {
            if (!status) return 'booked';
            return status.toLowerCase().replace(/\s+/g, '-');
        }

        function laborDisplay(val) { return LABOR_LABELS[val] || val || ''; }

        // ── Status update ──
        function handleStatusChange(bookingItemId, newStatus) {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            emit('trigger-event', {
                name: 'onUpdateItemStatus',
                event: { value: { booking_item_id: bookingItemId, new_status: newStatus } },
            });
        }

        // ── Build structure_data ──
        function buildStructureData() {
            const header = currentHeader.value;
            if (!header) return null;

            const deliveries = currentDeliveries.value;
            const lines = currentLines.value;

            const destGroups = {};
            for (const line of lines) {
                const dId = line.deliveries_headerid;
                if (!destGroups[dId]) destGroups[dId] = [];
                destGroups[dId].push(line);
            }

            const destinations = deliveries.map(delivery => {
                const dLines = destGroups[delivery.id] || [];
                const batchMap = {};

                for (const line of dLines) {
                    const key = `${line.customization || 'None'}::${line.labor || ''}`;
                    if (!batchMap[key]) {
                        batchMap[key] = { customization: line.customization || 'None', labor: line.labor || null, items: [] };
                    }

                    const bi = bookingItemLookup.value[line.bookingitems_headerid];
                    const inv = bi ? inventoryLookup.value[bi.sku] : null;

                    batchMap[key].items.push({
                        line_id: line.id,
                        booking_item_id: line.bookingitems_headerid,
                        sku: bi?.sku || '',
                        product_name: inv ? inv.model : 'Unknown Item',
                        product_image: inv?.imagelink || '',
                        quantity_allocated: line.quantity_assigned || 0,
                        quantity_total: bi?.quantity || 0,
                        status: bi?.status || 'Booked',
                    });
                }

                return {
                    delivery_id: delivery.id,
                    label: delivery.label || 'Unnamed',
                    delivery_type: delivery.deliverytype || '',
                    address: delivery.address || '',
                    deadline: delivery.deadline || '',
                    recipient_name: delivery.pic_name || '',
                    recipient_phone: delivery.pic_phone || '',
                    batches: Object.values(batchMap).map(bg => ({
                        batch_id: generateUid(),
                        customization: bg.customization,
                        labor: bg.labor,
                        bd_number: '',
                        items: bg.items,
                    })),
                };
            });

            const picBda = header.pic_bda ? teammateLookup.value[header.pic_bda] : null;
            const picOps = header.pic_ops ? teammateLookup.value[header.pic_ops] : null;

            return {
                opid: header.opid || '',
                title: header.title || '',
                pic_bda: picBda ? { id: picBda.id, name: picBda.name } : null,
                pic_ops: picOps ? { id: picOps.id, name: picOps.name } : null,
                quoteref: header.quoteref || '',
                invoiceref: header.invoiceref || '',
                destinations,
            };
        }

        // ── Action tracking ──
        const pendingAction = ref(null);
        const actionFailed = ref(false);
        const actionFailedLabel = ref('');
        const isAttempting = computed(() => !!pendingAction.value);

        function handleCreatePipeline() {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            if (pendingAction.value) return;

            const structureData = buildStructureData();
            if (!structureData) return;

            pendingAction.value = 'create';
            actionFailed.value = false;
            emit('trigger-event', {
                name: 'onCreatePipeline',
                event: {
                    value: {
                        orderplan_header_id: selectedId.value,
                        structure_data: structureData,
                    },
                },
            });
        }

        function handleBdChange() {
            /* wwEditor:start */
            if (props.wwEditorState?.isEditing) return;
            /* wwEditor:end */
            if (!currentPipeline.value || !localPipeline.value) return;

            pendingAction.value = 'update';
            actionFailed.value = false;
            emit('trigger-event', {
                name: 'onUpdatePipeline',
                event: {
                    value: {
                        pipeline_id: currentPipeline.value.id,
                        structure_data: localPipeline.value,
                    },
                },
            });
        }

        function handleRetry() {
            actionFailed.value = false;
            pendingAction.value = null;
        }

        const ACTION_LABELS = { create: 'Create Pipeline', update: 'Update Pipeline' };

        watch(actionStatus, (newStatus) => {
            if (!pendingAction.value) return;
            if (newStatus === 'successful') {
                pendingAction.value = null;
                actionFailed.value = false;
            } else if (newStatus === 'failed') {
                actionFailedLabel.value = ACTION_LABELS[pendingAction.value] || 'Action';
                pendingAction.value = null;
                actionFailed.value = true;
            }
        });

        return {
            currentHeader, currentDeliveries, attachedBookings,
            hasPipeline, localPipeline,
            getTeammateName, formatDate, formatDeadline, statusKey, laborDisplay,
            handleStatusChange, handleCreatePipeline, handleBdChange, handleRetry,
            pendingAction, isAttempting, actionFailed, actionFailedLabel,
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
$green-light: #d1fae5;
$amber: #f59e0b;
$amber-50: #fffbeb;
$gray-900: #111827;
$gray-800: #1e293b;
$gray-700: #374151;
$gray-600: #475569;
$gray-500: #6b7280;
$gray-400: #9ca3af;
$gray-300: #d1d5db;
$gray-200: #e5e7eb;
$gray-100: #f3f4f6;
$gray-50: #f9fafb;
$white: #ffffff;
$bg: #f0f0f0;
$radius: 10px;
$radius-sm: 6px;
$radius-xs: 4px;
$transition: 0.15s ease;
$font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$teal: #0d9488;
$teal-50: #f0fdfa;

.ops-manager { display: flex; flex-direction: column; width: 100%; min-height: 100%; background: $bg; font-family: $font; font-size: 12px; color: $gray-900; }

/* ═══ EMPTY STATE ═══ */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; }
.empty-icon { width: 48px; height: 48px; color: $gray-300; margin-bottom: 16px; }
.empty-text { font-size: 14px; color: $gray-500; margin: 0; }

/* ═══ FAILED TOAST ═══ */
.action-failed-bar { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: $red-50; border-bottom: 1px solid rgba($red, 0.15); cursor: pointer; transition: background $transition; &:hover { background: darken($red-50, 2%); } svg { width: 16px; height: 16px; color: $red; flex-shrink: 0; } }
.failed-text { font-size: 12px; font-weight: 600; color: $red-dark; }
.failed-retry { font-size: 11px; color: $red; text-decoration: underline; margin-left: auto; }

/* ═══ SPINNER ═══ */
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: $white; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════
   REVIEW MODE
   ═══════════════════════════════════════════ */
.review-mode { display: flex; flex-direction: column; }
.review-content { flex: 1; max-width: 960px; width: 100%; margin: 0 auto; padding: 24px 20px 60px; display: flex; flex-direction: column; gap: 28px; }
.review-section { display: flex; flex-direction: column; gap: 12px; }
.section-heading { font-size: 11px; font-weight: 700; color: $gray-500; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; display: flex; align-items: center; gap: 6px; }
.section-icon { width: 15px; height: 15px; flex-shrink: 0; }

/* ── Booking Block ── */
.bookings-empty { padding: 32px; text-align: center; border: 2px dashed $gray-200; border-radius: $radius; background: $white; }
.bookings-empty-text { font-size: 13px; color: $gray-500; margin: 0; }

.booking-block { background: $white; border: 1px solid $gray-200; border-radius: $radius; overflow: hidden; margin-bottom: 8px; }
.booking-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 16px 12px; }
.booking-header-info { display: flex; flex-direction: column; gap: 2px; }
.booking-header-top { display: flex; align-items: center; gap: 8px; }
.booking-bn { font-size: 13px; font-weight: 700; color: $gray-900; }
.booking-status-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.pill--booked { background: $blue-50; color: $blue; }
.pill--issue-raised { background: $red-50; color: $red; }
.pill--processing { background: $amber-50; color: $amber; }
.pill--delivered { background: $green-50; color: $green; }
.booking-title { font-size: 13px; font-weight: 600; color: $blue-dark; margin-top: 2px; }
.booking-subtitle { font-size: 11px; color: $gray-500; }
.booking-stats { font-size: 11px; color: $gray-400; }
.btn-dots { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; background: none; color: $gray-400; border-radius: $radius-xs; cursor: pointer; svg { width: 16px; height: 16px; } &:hover { color: $gray-600; background: $gray-50; } }
.btn-dots--sm { width: 24px; height: 24px; svg { width: 14px; height: 14px; } }

/* ── Booking Items Table ── */
.booking-items { border-top: 1px solid $gray-100; }
.items-header { display: grid; grid-template-columns: minmax(180px, 1fr) 160px 70px 110px 60px 32px; gap: 8px; padding: 8px 16px; border-bottom: 1px solid $gray-100; }
.ih { font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.05em; }
.ih-avail, .ih-qty { text-align: right; }
.ih-status { text-align: center; }
.item-row { display: grid; grid-template-columns: minmax(180px, 1fr) 160px 70px 110px 60px 32px; gap: 8px; padding: 10px 16px; border-bottom: 1px solid $gray-50; align-items: center; transition: background $transition; &:last-child { border-bottom: none; } &:hover { background: $gray-50; } }
.item-product { display: flex; align-items: center; gap: 10px; min-width: 0; }
.item-thumb { width: 40px; height: 40px; border-radius: $radius-sm; object-fit: cover; border: 1px solid $gray-200; flex-shrink: 0; }
.item-thumb-placeholder { width: 40px; height: 40px; border-radius: $radius-sm; background: $gray-100; display: flex; align-items: center; justify-content: center; flex-shrink: 0; svg { width: 18px; height: 18px; color: $gray-400; } }
.item-product-text { min-width: 0; }
.item-model { font-size: 12px; font-weight: 600; color: $gray-900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-variant { font-size: 11px; color: $gray-500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sku { font-size: 11px; color: $gray-500; font-family: 'SF Mono', 'Fira Code', monospace; }
.item-avail { font-size: 13px; font-weight: 700; text-align: right; }
.avail-pos { color: $green; }
.avail-neg { color: $red; }
.item-status-cell { text-align: center; }
.status-select { appearance: none; -webkit-appearance: none; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; font-family: $font; border: 1px solid transparent; cursor: pointer; text-align: center; outline: none; transition: all $transition; }
.ss--booked { background: $blue-50; color: $blue; border-color: rgba($blue, 0.15); }
.ss--issue-raised { background: $red-50; color: $red-dark; border-color: rgba($red, 0.15); }
.ss--processing { background: $amber-50; color: darken($amber, 10%); border-color: rgba($amber, 0.2); }
.ss--delivered { background: $green-50; color: $green; border-color: rgba($green, 0.15); }
.item-qty { font-size: 14px; font-weight: 700; text-align: right; color: $gray-900; }
.item-action { display: flex; justify-content: center; }

/* ── Metadata Card ── */
.meta-card { background: $white; border: 1px solid $gray-200; border-radius: $radius; padding: 20px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.meta-field { display: flex; flex-direction: column; gap: 4px; }
.meta-field--full { grid-column: 1 / -1; }
.field-label { font-size: 10px; font-weight: 700; color: $gray-500; text-transform: uppercase; letter-spacing: 0.04em; }
.meta-value-box { height: 38px; padding: 0 12px; border: 1.5px solid $gray-200; border-radius: $radius-sm; font-size: 12px; color: $gray-900; background: $gray-50; display: flex; align-items: center; }
.meta-value-box--select { justify-content: space-between; }
.chevron { width: 14px; height: 14px; color: $gray-400; flex-shrink: 0; }

/* ── Delivery Cards ── */
.deliveries-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.delivery-card { background: $white; border: 1px solid $gray-200; border-radius: $radius; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.delivery-card-header { display: flex; align-items: center; gap: 8px; }
.delivery-index { width: 24px; height: 24px; border-radius: 50%; background: $blue-50; color: $blue; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.delivery-label-text { font-size: 13px; font-weight: 600; color: $gray-900; }
.delivery-fields { display: flex; flex-direction: column; gap: 8px; }
.delivery-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.delivery-field { display: flex; flex-direction: column; gap: 3px; }
.field-label-sm { font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; }
.delivery-val-box { padding: 8px 10px; border: 1px solid $gray-200; border-radius: $radius-xs; font-size: 12px; color: $gray-900; background: $gray-50; min-height: 34px; display: flex; align-items: center; }
.delivery-val-box--tall { min-height: 52px; align-items: flex-start; line-height: 1.4; }
.delivery-val-box--muted { color: $gray-400; }

/* ── Create Pipeline Button ── */
.create-pipeline-wrap { display: flex; justify-content: center; padding: 8px 0 24px; }
.btn-create-pipeline { display: flex; align-items: center; gap: 8px; padding: 14px 32px; font-size: 14px; font-weight: 700; font-family: $font; color: $white; background: $gray-800; border: none; border-radius: $radius; cursor: pointer; transition: all $transition; svg { width: 18px; height: 18px; } &:hover { background: $gray-900; box-shadow: 0 4px 12px rgba(0,0,0,0.15); } &:disabled { opacity: 0.5; cursor: not-allowed; } }
.btn--attempting { opacity: 0.7; cursor: wait; pointer-events: none; }

/* ═══════════════════════════════════════════
   PIPELINE MODE
   ═══════════════════════════════════════════ */
.pipeline-mode { display: flex; flex-direction: column; }

/* ── Header Bar ── */
.pipeline-header-bar { display: flex; align-items: center; gap: 12px; padding: 14px 24px; background: $gray-800; color: $white; }
.opid-badge { font-size: 11px; font-weight: 700; background: rgba($white, 0.12); padding: 4px 10px; border-radius: $radius-xs; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.02em; }
.pipeline-title-text { font-size: 14px; font-weight: 600; }

/* ── Column Headers ── */
.pipeline-col-headers { display: flex; border-bottom: 1px solid $gray-200; background: $white; }
.col-headers-main { flex: 1; display: flex; padding: 12px 24px; }
.col-headers-dest { width: 220px; flex-shrink: 0; padding: 12px 16px; border-left: 1px solid $gray-200; }
.col-h { font-size: 10px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.06em; }

/* ── Pipeline Body ── */
.pipeline-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

/* ── Destination Group ── */
.dest-group { display: flex; gap: 0; }

.dest-content { flex: 1; border: 1px solid $gray-200; border-radius: $radius 0 0 $radius; background: $white; overflow: hidden; }

.batch-row { display: flex; align-items: center; padding: 28px 24px; gap: 20px; }
.batch-row--border { border-bottom: 1px solid $gray-100; }

/* ── Col 1: Allocated Items ── */
.cell-allocated { flex: 0 0 25%; display: flex; flex-direction: column; gap: 12px; }
.batch-type-badge { display: inline-flex; align-self: flex-start; padding: 3px 10px; border-radius: $radius-xs; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; background: $teal-50; color: $teal; border: 1px solid rgba($teal, 0.15); }
.p-item { display: flex; align-items: center; gap: 12px; }
.p-item-info { flex: 1; min-width: 0; }
.p-item-name { font-size: 13px; font-weight: 600; color: $gray-900; }
.p-item-sku { font-size: 10px; color: $gray-500; font-family: 'SF Mono', 'Fira Code', monospace; }
.p-item-qty { text-align: right; flex-shrink: 0; }
.pq-num { font-size: 18px; font-weight: 700; color: $gray-900; }
.pq-full { color: $green; }
.pq-total { font-size: 11px; color: $gray-400; }
.pq-label { display: block; font-size: 8px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.05em; }

/* ── Col 2: Batch Assignment ── */
.cell-batch { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
.cell-label { font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; }
.bd-input { height: 36px; width: 140px; padding: 0 10px; border: 1.5px solid $gray-200; border-radius: $radius-sm; font-size: 12px; font-family: $font; color: $gray-900; background: $white; outline: none; transition: border-color $transition, box-shadow $transition; &::placeholder { color: $gray-400; } &:focus { border-color: $blue; box-shadow: 0 0 0 3px rgba($blue, 0.08); } }

/* ── Flow Arrow ── */
.flow-arrow { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 4px; color: $gray-300; svg { width: 20px; height: 20px; } }

/* ── Col 3: Customization ── */
.cell-cust { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.cust-icon { width: 28px; height: 28px; color: $gray-500; flex-shrink: 0; padding: 4px; background: $gray-50; border-radius: $radius-xs; }
.cust-text { display: flex; flex-direction: column; }
.cust-name { font-size: 13px; font-weight: 600; color: $gray-800; }
.cust-labor { font-size: 11px; color: $gray-500; }

/* ── Col 4: Documentation ── */
.cell-doc { flex: 0 0 auto; }
.doc-card-node { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 20px; border: 1.5px solid $gray-200; border-radius: $radius; background: $white; min-width: 100px; transition: border-color $transition; &:hover { border-color: $gray-300; } }
.doc-node-icon { width: 24px; height: 24px; color: $gray-500; }
.doc-node-title { font-size: 11px; font-weight: 700; color: $gray-800; }
.doc-node-sub { font-size: 9px; color: $gray-400; }

/* ── Col 5: Destination Sidebar ── */
.dest-sidebar { width: 220px; flex-shrink: 0; }
.dest-card { padding: 20px 16px; background: $gray-50; border: 1px solid $gray-200; border-left: none; border-radius: 0 $radius $radius 0; height: 100%; display: flex; flex-direction: column; gap: 14px; }
.dest-card-icon { width: 24px; height: 24px; color: $gray-500; }
.dest-card-name { font-size: 14px; font-weight: 700; color: $gray-900; margin: 0; }
.dest-detail { display: flex; gap: 8px; align-items: flex-start; }
.dest-detail-icon { width: 14px; height: 14px; color: $gray-400; flex-shrink: 0; margin-top: 2px; }
.dest-detail-text { font-size: 11px; color: $gray-600; line-height: 1.4; }
.dest-detail-label { display: block; font-size: 9px; font-weight: 700; color: $gray-400; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
.dest-detail-value { display: block; font-size: 11px; color: $gray-700; line-height: 1.4; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 900px) {
    .dest-group { flex-direction: column; }
    .dest-sidebar { width: 100%; }
    .dest-card { border-left: 1px solid $gray-200; border-top: none; border-radius: 0 0 $radius $radius; }
    .dest-content { border-radius: $radius $radius 0 0; }
    .batch-row { flex-wrap: wrap; gap: 16px; }
    .cell-allocated { flex: 0 0 100%; }
    .pipeline-col-headers { display: none; }
}
@media (max-width: 768px) {
    .meta-grid { grid-template-columns: 1fr; }
    .meta-field--full { grid-column: 1; }
    .deliveries-grid { grid-template-columns: 1fr; }
    .items-header { display: none; }
    .item-row { grid-template-columns: 1fr; gap: 8px; padding: 12px 16px; }
    .item-product { grid-column: 1; }
    .review-content { padding: 16px 12px 48px; }
}
@media (max-width: 480px) {
    .delivery-row-2col { grid-template-columns: 1fr; }
    .pipeline-header-bar { padding: 12px 16px; flex-wrap: wrap; }
}
</style>
