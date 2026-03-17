import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Button, Select } from 'antd';
import useLocationApi from '../../api/useLocationApi';
import useCompanyApi from '../../api/useCompanyApi';

const { Option } = Select;

const DeviceManageDrawer = ({ visible, onClose, onSubmit }) => {
    const { apiCountryList, apiStateList, apiCityList } = useLocationApi();
    const { apiCompanyAdd } = useCompanyApi();
    const [form] = Form.useForm();
    const [countryData, setCountryData] = useState([]);
    const [stateData, setStateData] = useState([]);
    const [cityData, setCityData] = useState([]);

    useEffect(() => {
        getCountryData();
    }, [visible]);
    const getCountryData = async () => {
        const res_country_data = await apiCountryList();
        if (!res_country_data.status) {
            return;
        }
        setCountryData(res_country_data.data);
    };


    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                company_name: values.company_name,
                email: values.email,
                mobile: values.mobile,
                cities_id: values.city,
            };
            const createData = await apiCompanyAdd(payload);
            onSubmit(values); // Optional: pass to parent
            form.resetFields();
            onClose();
        } catch (error) {
            console.log("Form validation or API failed:", error);
        }
    };



    const handleCountryChange = async (value, option) => {
        setCityData([]); // Reset city data when country changes
        setStateData([]); // Reset state data when country changes
        const res_state_data = await apiStateList(option.key); // Assuming option.key is the country ID
        if (!res_state_data.status) {
            return;
        }
        setStateData(res_state_data.data);
    };


    const handleStateChange = async (value, option) => {
        setCityData([]);

        const res_city_data = await apiCityList(option.key); // Assuming option.key is the state ID
        if (!res_city_data.status) {
            return;
        }
        setCityData(res_city_data.data);
    };


    return (
        <Drawer
            title="Assign Device"
            width={400}
            onClose={onClose}
            open={visible}
            bodyStyle={{ paddingBottom: 80 }}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onClose} style={{ marginRight: 8 }}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} type="primary">
                        Submit
                    </Button>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
                name="company_form"
                initialValues={{ city: '' }}
            >
                <Form.Item
                    name="company_name"
                    label="Company Name"
                    rules={[{ required: true, message: 'Please enter the company name' }]}
                >
                    <Input placeholder="Enter company name" />
                </Form.Item>
                <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                        { required: true, message: 'Please enter the email' },
                        { type: 'email', message: 'Please enter a valid email' },
                    ]}
                >
                    <Input placeholder="Enter email" />
                </Form.Item>
                <Form.Item
                    name="mobile"
                    label="Mobile"
                    rules={[
                        { required: true, message: 'Please enter the mobile number' },
                        {
                            pattern: /^[0-9]{10}$/,
                            message: 'Please enter a valid 10-digit mobile number',
                        },
                    ]}
                >
                    <Input placeholder="Enter mobile number" />
                </Form.Item>
                <Form.Item
                    name="country"
                    label="Country"
                    rules={[{ required: true, message: 'Please select a country' }]}
                >
                    <Select
                        showSearch
                        placeholder="Select a Country"
                        optionFilterProp="children"
                        onChange={handleCountryChange} // <--- here
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {countryData.map((item) => (
                            <Option key={item.id} value={item.id}>
                                {`${item.name} (${item.region})`}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>


                <Form.Item
                    name="state"
                    label="State"
                    rules={[{ required: true, message: 'Please select a State' }]}
                >
                    <Select
                        showSearch
                        placeholder="Select a State"
                        optionFilterProp="children"
                        onChange={handleStateChange}
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {stateData.map((state) => (
                            <Option key={state.id} value={state.id}>
                                {state.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="city"
                    label="City"
                    rules={[{ required: true, message: 'Please select a city' }]}
                >
                    <Select
                        showSearch
                        placeholder="Select a City"
                        optionFilterProp="children"
                        // onChange={handleCityChange}
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {cityData.map((city) => (
                            <Option key={city.id} value={city.id}>
                                {city.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default DeviceManageDrawer;