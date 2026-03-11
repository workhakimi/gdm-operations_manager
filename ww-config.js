export default {
    editor: {
        label: { en: 'Operations Manager' },
        icon: 'dashboard',
        customSettingsPropertiesOrder: [
            {
                label: 'Selection Context',
                isCollapsible: true,
                properties: ['selectedOrderPlanId', 'actionStatus'],
            },
            {
                label: 'Order Plan Data',
                isCollapsible: true,
                properties: [
                    'orderplanHeadersData',
                    'orderplanDeliveriesData',
                    'orderplanAttBookingsData',
                    'orderplanLinesData',
                ],
            },
            {
                label: 'Booking Data Sources',
                isCollapsible: true,
                properties: ['bookingHeaders', 'bookingItems'],
            },
            {
                label: 'Reference Data',
                isCollapsible: true,
                properties: ['inventoryData', 'teammatesList', 'customizationOptions', 'laborOptions'],
            },
            {
                label: 'Colors',
                isCollapsible: true,
                properties: [
                    'colorHeaderBarBg',
                    'colorCardHeaderBg',
                    'colorCardHeaderText',
                    'colorBatchSeparator',
                    'colorTableHeaderBg',
                    'colorConfirmBtnBg',
                ],
            },
        ],
    },
    triggerEvents: [
        {
            name: 'onUpdateItemStatus',
            label: { en: 'On Update Item Status' },
            event: {
                value: {
                    booking_item_id: null,
                    new_status: null,
                },
            },
            default: true,
        },
        {
            name: 'onSetBdNumber',
            label: { en: 'On Set BD Number' },
            event: {
                value: {
                    batch_key: null,
                    line_ids: [],
                    bd_number: null,
                },
            },
            default: false,
        },
        {
            name: 'onSetDoLink',
            label: { en: 'On Set DO Link' },
            event: {
                value: {
                    batch_key: null,
                    line_ids: [],
                    do_folder: null,
                },
            },
            default: false,
        },
        {
            name: 'onSaveOrderPlan',
            label: { en: 'On Save Order Plan' },
            event: { value: {} },
            default: false,
        },
        {
            name: 'onSubmitOrderPlan',
            label: { en: 'On Submit Order Plan' },
            event: { value: {} },
            default: false,
        },
        {
            name: 'onDeleteOrderPlan',
            label: { en: 'On Delete Order Plan' },
            event: { value: { headerId: null, opid: null } },
            default: false,
        },
        {
            name: 'onUnsubmitOrderPlan',
            label: { en: 'On Unsubmit Order Plan' },
            event: { value: { headerId: null, opid: null, status: 'Draft' } },
            default: false,
        },
        {
            name: 'onUnsetBdNumber',
            label: { en: 'On Unset BD Number' },
            event: { value: { batch_key: null, line_ids: [] } },
            default: false,
        },
        {
            name: 'onUnsetDoLink',
            label: { en: 'On Unset DO Link' },
            event: { value: { batch_key: null, line_ids: [] } },
            default: false,
        },
    ],
    properties: {
        selectedOrderPlanId: {
            label: { en: 'Selected Order Plan ID' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'UUID of the selected orderplan_headers row.',
            },
            /* wwEditor:end */
        },
        actionStatus: {
            label: { en: 'Action Status' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Set to "successful" or "failed" after an action. Empty = idle.',
            },
            /* wwEditor:end */
        },
        orderplanHeadersData: {
            label: { en: 'Order Plan Headers' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of orderplan_headers rows: { id, opid, title, pic_bda, pic_ops, quoteref, invoiceref, status, created_at, updated_at, submitted_at }',
            },
            /* wwEditor:end */
        },
        orderplanDeliveriesData: {
            label: { en: 'Order Plan Deliveries' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of orderplan_deliveries rows: { id, headerid, label, deliverytype, address, remarks, pic_name, pic_phone, deadline }',
            },
            /* wwEditor:end */
        },
        orderplanAttBookingsData: {
            label: { en: 'Order Plan Attached Bookings' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of orderplan_attbookings rows: { id, headerid, booking_headerid }',
            },
            /* wwEditor:end */
        },
        orderplanLinesData: {
            label: { en: 'Order Plan Lines' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of orderplan_lines rows: { id, headerid, bookingitems_headerid, deliveries_headerid, customization, quantity_assigned, splitgroupid, labor, mockup_link }',
            },
            /* wwEditor:end */
        },
        bookingHeaders: {
            label: { en: 'Booking Headers' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of booking_headers: { id, bookingnumber, bookingtitle, pic_id, status, unique_skus, total_quantity, created_at }',
            },
            /* wwEditor:end */
        },
        bookingItems: {
            label: { en: 'Booking Items' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of booking_items: { id, headerid, sku, quantity, status, balanceref, indicator }',
            },
            /* wwEditor:end */
        },
        inventoryData: {
            label: { en: 'Inventory Data' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of inventory_data: { sku, type, model, color, size, tags, snt, imagelink }',
            },
            /* wwEditor:end */
        },
        teammatesList: {
            label: { en: 'Teammates List' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of teammates: { id, name, type, email, phone }',
            },
            /* wwEditor:end */
        },
        customizationOptions: {
            label: { en: 'Customization Options' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [
                { value: 'None', label: 'None' },
                { value: 'UV 1 Logo', label: 'UV 1 Logo' },
                { value: 'UV 2 Logo', label: 'UV 2 Logo' },
                { value: 'UV 360', label: 'UV 360' },
                { value: 'Laser Engraving', label: 'Laser Engraving' },
                { value: 'Debossing', label: 'Debossing' },
            ],
        },
        laborOptions: {
            label: { en: 'Labor Options' },
            type: 'ObjectList',
            section: 'settings',
            bindable: true,
            defaultValue: [
                { value: '', label: 'None' },
                { value: 'sleeving', label: 'Box Sleeving' },
                { value: 'giftbox', label: 'Standard Gift Box' },
                { value: 'giftbox_addons', label: 'Gift Box + Addons' },
            ],
        },
        colorHeaderBarBg: {
            label: { en: 'Header Bar Background' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#1e293b',
        },
        colorCardHeaderBg: {
            label: { en: 'Card Header Background' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#f1f5f9',
        },
        colorCardHeaderText: {
            label: { en: 'Card Header Text' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#111827',
        },
        colorBatchSeparator: {
            label: { en: 'Batch Separator Color' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#e5e7eb',
        },
        colorTableHeaderBg: {
            label: { en: 'Table Header Background' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#f9fafb',
        },
        colorConfirmBtnBg: {
            label: { en: 'Confirm Button Background' },
            type: 'Color',
            section: 'settings',
            bindable: true,
            defaultValue: '#1e293b',
        },
    },
};
