// MembersTable

import * as React from 'react';
import MUIDataTable from "mui-datatables";
import CustomButton from '../common/Button';
import { Typography } from '@mui/material';
import UserMappedByRole from '../../../../utils/UserMappedByRole/UserMappedByRole';

const columns = [
    {
        name: "Name",
        label: "Name",
        options: {
            filter: false,
            sort: false,
            align: "center"
        }
    },
    {
        name: "Email",
        label: "Email",
        options: {
            filter: false,
            sort: false,
        }
    },
    {
        name: "Role",
        label: "Role",
        options: {
            filter: false,
            sort: false,
        }
    },
    {
        name: "Actions",
        label: "Actions",
        options: {
            filter: false,
            sort: false,
        }
    }];



// const data = [
//     ["Shoonya User", "user123@tarento.com", <Typography variant="caption" sx={{p:1, backgroundColor:"rgb(255, 99, 71,0.2)", color:"rgb(255, 99, 71)", borderRadius : 2}}>Admin</Typography>, <CustomButton sx={{ p: 1, borderRadius: 2 }} label={"View"} />]
// ];

const options = {
    filterType: 'checkbox',
    selectableRows: "none",
    download: false,
    filter: false,
    print: false,
    search: false,
    viewColumns: false,
};

const MembersTable = (props) => {
    const { dataSource } = props;

    console.log(dataSource);
    const data = dataSource && dataSource.length > 0 ? dataSource.map((el, i) => {
        const userRole = el.role && UserMappedByRole(el.role).element;
        return [el.username, el.email, userRole ? userRole : el.role, <CustomButton sx={{ p: 1, borderRadius: 2 }} onClick={() => { console.log(el.id) }} label={"View"} />]
    }) : []

    return (
        <React.Fragment>
            <MUIDataTable
                title={""}
                data={data}
                columns={columns}
                options={options}
            // filter={false}
            />
        </React.Fragment>
    )
}

export default MembersTable;