// const BASEURL = "http://arvind-backend.iotblitz.in";
const BASEURL = "http://localhost:8051";
// const BASEURL = "http://192.168.29.210:8051";

// const WSBASEURL = "ws://192.168.29.210:8051";
const WSBASEURL = "ws://localhost:8051";
// const WSBASEURL = "ws://arvind-backend.iotblitz.in";


// wss://wfmsapi.iotblitz.com/api/water_ms_routes/water_station/WFMS/1/1674/TECH000281


export const address = {
    WS_DEVICE_CONNECTIONS: `${WSBASEURL}/api/water_ms_routes/water_station/WFMS/1/`, // e.g., /ws/device/1

    WS_DEVICE_DASHBOARD:`${WSBASEURL}/api/water_ms_routes/water_station/WFMS/1/`,
    WS_DEVICE_SHEDULING_DASHBOARD:`${WSBASEURL}/api/water_ms_routes/water_station/WFMS_SETTINGS/1/`,
    


    LOGIN: `${BASEURL}/api/auth/login`,
    SEND_OTP: `${BASEURL}/api/auth/send-otp`,
    VERIFY_OTP: `${BASEURL}/api/auth/verify-otp`,


    MENU_ORG_PROJECT_LIST: `${BASEURL}/api/client/manage_organization_project/list`,
    DASHBOARD_DEVICE_LIST: `${BASEURL}/api/client/project/devices/list`,
    DASHBOARD_DEVICE_LIST_TYPE: `${BASEURL}/api/client/project/devices/list/type`,
    SWITCH_API:`${BASEURL}/api/mqtt/publish_all_digital_output`,
    VALVE_DATA:`${BASEURL}/api/mqtt/publish_schedule_data`,
    SHEDULING_SAVE:`${BASEURL}/api/mqtt/publish_schedule`,
    GET_SHEDULING:`${BASEURL}/api/mqtt/read_sheduling`,
    RESET_SHEDULING:`${BASEURL}/api/mqtt/reset_sheduling`,
    READ_LAST_DATA:`${BASEURL}/api/mqtt/read_last_data`,

    WEBSOSKET_RES:`${BASEURL}/api/device/waterflow_data_wfms`,

    ALL_DEVICE_LIST:`${BASEURL}/api/client/devices_list`,

    DEVICE_STATUS_UPDATE:`${BASEURL}/api/client/devices/status_update`,
    DEVICE_INFO_LIST:`${BASEURL}/api/client/devices/device_info`,
    DEVICE_CHART_LIST:`${BASEURL}/api/client/report/last1000data`,

    REPORT_DEVICE_REPORT:`${BASEURL}/api/client/report/water_flow_data`,
    REPORT_AMS_ALERT_REPORT:`${BASEURL}/api/client/report/ams_alert_report`,

    GET_DEVICE_THRESHOLDS: `${BASEURL}/api/device/device_thresholds/`,
    POST_DEVICE_THRESHOLDS: `${BASEURL}/api/device/device_thresholds`,

// {
//     "device": "TECH000004",
//     "device_id": 246,
//     "client_id": 1
// }
// /api/device/waterflow_data_wfms

// Master - Organization
    MANAGE_ORGANIZATION_LIST: `${BASEURL}/api/client/manage_organization/list`,
    MANAGE_ORGANIZATION_ADD: `${BASEURL}/api/client/manage_organization/add`,
    MANAGE_ORGANIZATION_EDIT: `${BASEURL}/api/client/manage_organization/edit`,
    MANAGE_ORGANIZATION_DELETE: `${BASEURL}/api/client/manage_organization/delete`,

    // Master - User
    MANAGE_USER_LIST: `${BASEURL}/api/client/manage_user/list`,
    MANAGE_USER_ADD: `${BASEURL}/api/client/manage_user/add`,
    MANAGE_USER_EDIT: `${BASEURL}/api/client/manage_user/edit`,
    MANAGE_USER_DELETE: `${BASEURL}/api/client/manage_user/delete`,

    // Master - Project
    MANAGE_PROJECTS_LIST: `${BASEURL}/api/client/manage_projects/list`,
    MANAGE_PROJECTS_ADD: `${BASEURL}/api/client/manage_projects/add`,
    MANAGE_PROJECTS_EDIT: `${BASEURL}/api/client/manage_projects/edit`,
    MANAGE_PROJECTS_DELETE: `${BASEURL}/api/client/manage_projects/delete`,

    // Management - Device
    MANAGE_DEVICES_LIST: `${BASEURL}/api/client/manage/devices/list`,
    MANAGE_DEVICES_ADD: `${BASEURL}/api/client/manage/devices/add`,
    MANAGE_DEVICES_EDIT: `${BASEURL}/api/client/manage/devices/edit`,
    
    // Management - Project Management
    MANAGE_PROJECT_DEVICE_LIST: `${BASEURL}/api/client/manage_project/project_list_device`,
    MANAGE_PROJECT_DEVICE_ADD: `${BASEURL}/api/client/manage_project/project_add_device`,
    MANAGE_PROJECT_DEVICE_DELETE: `${BASEURL}/api/client/manage_project/project_delete_device`,

    // Management - User Management
    MANAGE_USER_DEVICE_LIST: `${BASEURL}/api/client/manage_user/list_user_device`,  
    MANAGE_USER_DEVICE_ADD: `${BASEURL}/api/client/manage_user/add_device`,
    MANAGE_USER_DEVICE_EDIT: `${BASEURL}/api/client/manage_user/edit_user_device`,
    MANAGE_USER_DEVICE_DELETE: `${BASEURL}/api/client/manage_user/delete_user_device`,

    // Gateway Management
    MANAGEMENT_GATEWAY_LIST: `${BASEURL}/api/management_gateway/list`,
    MANAGEMENT_GATEWAY_ADD: `${BASEURL}/api/management_gateway/add`,
    MANAGEMENT_GATEWAY_EDIT: `${BASEURL}/api/management_gateway/edit`,
    MANAGEMENT_GATEWAY_DELETE: `${BASEURL}/api/management_gateway/delete`,

    // Branch Management
    MANAGE_BRANCH_LIST: `${BASEURL}/api/client/manage_branch/list`,
    MANAGE_BRANCH_ADD: `${BASEURL}/api/client/manage_branch/add`,
    MANAGE_BRANCH_EDIT: `${BASEURL}/api/client/manage_branch/edit`,
    MANAGE_BRANCH_DELETE: `${BASEURL}/api/client/manage_branch/delete`,
    MANAGE_BRANCH_AVAILABLE_NUMBERS: `${BASEURL}/api/client/manage_branch/available_branch_numbers`,

    // Branch Device Assignment
    MANAGE_BRANCH_DEVICE_LIST: `${BASEURL}/api/client/manage_branch/device_list`,
    MANAGE_BRANCH_DEVICE_ADD: `${BASEURL}/api/client/manage_branch/add_device`,
    MANAGE_BRANCH_DEVICE_DELETE: `${BASEURL}/api/client/manage_branch/delete_device`,

    // Branch Scheduling
    MANAGE_BRANCH_SCHEDULING_GET: `${BASEURL}/api/client/manage_branch/get_scheduling`,
    MANAGE_BRANCH_SCHEDULING_SAVE: `${BASEURL}/api/client/manage_branch/save_scheduling`,
    MANAGE_BRANCH_SCHEDULING_RESET: `${BASEURL}/api/client/manage_branch/reset_scheduling`,

    // Branch Switch (Manual Mode)
    MANAGE_BRANCH_SWITCH: `${BASEURL}/api/client/manage_branch/switch`,

    // Branch Config (Full Control Panel)
    MANAGE_BRANCH_CONFIG_GET: `${BASEURL}/api/client/manage_branch/get_config`,

    // Branch-Level (ALL devices) Switch / Schedule
    MANAGE_BRANCH_SWITCH_ALL: `${BASEURL}/api/client/manage_branch/switch_all`,
    MANAGE_BRANCH_SCHEDULE_SAVE_ALL: `${BASEURL}/api/client/manage_branch/schedule_save_all`,
    MANAGE_BRANCH_SCHEDULE_RESET_ALL: `${BASEURL}/api/client/manage_branch/schedule_reset_all`,

};