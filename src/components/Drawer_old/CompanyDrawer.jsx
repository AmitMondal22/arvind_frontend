import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Button, Select } from 'antd';
import useLocationApi from '../../api/useLocationApi';
import useCompanyApi from '../../api/useCompanyApi';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;

const CompanyDrawer = ({ visible, onClose, onSubmit }) => {
    const { apiCountryList, apiStateList, apiCityList } = useLocationApi();
    const { apiCompanyAdd } = useCompanyApi();
    const [form] = Form.useForm();
    const [countryData, setCountryData] = useState([]);
    const [stateData, setStateData] = useState([]);
    const [cityData, setCityData] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        if (visible) {
            getCountryData();
            form.resetFields();
            setStateData([]);
            setCityData([]);
        }
    }, [visible]);

    const getCountryData = async () => {
        const res_country_data = await apiCountryList();
        if (res_country_data?.status) {
            setCountryData(res_country_data.data);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                company_name: values.company_name,
                email: values.email,
                mobile: values.mobile,
                cities_id: values.city,
                parent_company_id: user?.user_infos?.[0]?.company?.id,
                description: values.description || '',
                password: values.password,
            };
            const createData = await apiCompanyAdd(payload);
            if (createData?.status) {
                onSubmit(values);
                form.resetFields();
                onClose();
            }
        } catch (error) {
            console.error("Form validation or API failed:", error);
        }
    };

    const handleCountryChange = async (value, option) => {
        setStateData([]);
        setCityData([]);
        const res_state_data = await apiStateList(option.key);
        if (res_state_data?.status) {
            setStateData(res_state_data.data);
        }
    };

    const handleStateChange = async (value, option) => {
        setCityData([]);
        const res_city_data = await apiCityList(option.key);
        if (res_city_data?.status) {
            setCityData(res_city_data.data);
        }
    };

    return (
        <Drawer
            title="Create Company"
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
                        onChange={handleCountryChange}
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
                    rules={[{ required: true, message: 'Please select a state' }]}
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

                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea placeholder="Enter company description" rows={3} />
                </Form.Item>

                <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter a password',
                        },
                        {
                            min: 6,
                            message: 'Password must be at least 6 characters',
                        },
                    ]}
                >
                    <Input.Password placeholder="Enter password" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default CompanyDrawer;
