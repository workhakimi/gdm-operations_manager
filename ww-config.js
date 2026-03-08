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
                properties: ['inventoryData', 'teammatesList'],
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
            name: 'onUpdateLineField',
            label: { en: 'On Update Line Field' },
            event: {
                value: {
                    line_id: null,
                    field: null,
                    value: null,
                },
            },
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
    },
};
