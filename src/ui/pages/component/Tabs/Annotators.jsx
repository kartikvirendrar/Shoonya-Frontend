import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from 'react-router-dom';
import MUIDataTable from "mui-datatables";
import { useDispatch, useSelector } from 'react-redux';
import GetWorkspacesAnnotatorsDataAPI from "../../../../redux/actions/api/WorkspaceDetails/GetWorkspaceAnnotators";
import APITransport from '../../../../redux/actions/apitransport/apitransport';
import UserMappedByRole from "../../../../utils/UserMappedByRole/UserMappedByRole";
import CustomButton from "../common/Button";
import { ThemeProvider,Grid } from "@mui/material";
import tableTheme from "../../../theme/tableTheme";
import RemoveWorkspaceMemberAPI from "../../../../redux/actions/api/WorkspaceDetails/RemoveWorkspaceMember";
import Search from "../../component/common/Search";
import RemoveWorkspaceFrozenUserAPI from "../../../../redux/actions/api/WorkspaceDetails/RemoveWorkspaceFrozenUser";

const AnnotatorsTable = (props) => {
    const dispatch = useDispatch();
    const { onRemoveSuccessGetUpdatedMembers } = props;

    const [loading, setLoading] = useState(false);
    const { id } = useParams();
    const [snackbar, setSnackbarInfo] = useState({
        open: false,
        message: "",
        variant: "success",
    });

    const orgId = useSelector(state => state.getWorkspacesProjectData?.data?.[0]?.organization_id);
    const SearchWorkspaceMembers = useSelector((state) => state.SearchProjectCards.data);
    const getWorkspaceAnnotatorsData = () => {

        const workspaceObjs = new GetWorkspacesAnnotatorsDataAPI(id);

        dispatch(APITransport(workspaceObjs));
    }

    const workspaceAnnotators = useSelector(state => state.getWorkspacesAnnotatorsData.data);
    const workspaceDtails = useSelector(state=>state.getWorkspaceDetails.data);


    useEffect(() => {
        getWorkspaceAnnotatorsData();
    }, []);
    // const orgId = workspaceAnnotators &&  workspaceAnnotators
    // getWorkspacesProjectData
    const handleRemoveWorkspaceMember = async (Projectid) => {
        const workspacedata = {
            user_id: Projectid,
        }
        const projectObj = new RemoveWorkspaceMemberAPI(id, workspacedata);
        // dispatch(APITransport(projectObj));
        const res = await fetch(projectObj.apiEndPoint(), {
            method: "POST",
            body: JSON.stringify(projectObj.getBody()),
            headers: projectObj.getHeaders().headers,
        });
        const resp = await res.json();
        setLoading(false);
        if (res.ok) {
            setSnackbarInfo({
                open: true,
                message: resp?.message,
                variant: "success",
            })
            onRemoveSuccessGetUpdatedMembers();
        } else {
            setSnackbarInfo({
                open: true,
                message: resp?.message,
                variant: "error",
            })
        }

    }

    const handleRemoveFrozenUsers = async (FrozenUserId) => {
        const projectObj = new RemoveWorkspaceFrozenUserAPI(id, { user_id: FrozenUserId });
        const res = await fetch(projectObj.apiEndPoint(), {
          method: "POST",
          body: JSON.stringify(projectObj.getBody()),
          headers: projectObj.getHeaders().headers,
        });
        const resp = await res.json();
        // setLoading(false);
        if (res.ok) {
          setSnackbarInfo({
            open: true,
            message: resp?.message,
            variant: "success",
          });
          onRemoveSuccessGetUpdatedMembers();
        } else {
          setSnackbarInfo({
            open: true,
            message: resp?.message,
            variant: "error",
          });
        }
      };
    

    const pageSearch = () => {

        return workspaceAnnotators.filter((el) => {

            if (SearchWorkspaceMembers == "") {

                return el;
            } else if (
                el.username
                    ?.toLowerCase()
                    .includes(SearchWorkspaceMembers?.toLowerCase())
            ) {

                return el;
            } else if (
                el.email
                    ?.toLowerCase()
                    .includes(SearchWorkspaceMembers?.toLowerCase())
            ) {

                return el;
            }


        })

    }
    const columns = [
        {
            name: "id",
            label: "Id",
            options: {
                filter: false,
                sort: false,
                align: "center",
                display:"excluded",
                setCellHeaderProps: sort => ({ style: { height: "70px", padding: "16px" } }),
            }
        },
        {
            name: "Name",
            label: "Name",
            options: {
                filter: false,
                sort: false,
                align: "center",
                setCellHeaderProps: sort => ({ style: { height: "70px", padding: "16px" } }),
            }
        },
        {
            name: "Email",
            label: "Email",
            options: {
                filter: false,
                sort: false,
                align: "center"
            }
        },
        {
            name: "Role",
            label: "Role",
            options: {
                filter: false,
                sort: false,
                align: "center"
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

        const projectlist = (el) => {
            let temp = false;
            workspaceDtails?.frozen_users?.forEach((em) => {
              if (el == em.id) {
                temp = true;
              }
            });
            return temp;
          };

          

    const data = workspaceAnnotators && workspaceAnnotators.length > 0 ? pageSearch().map((el, i) => {
        const userRole = el.role && UserMappedByRole(el.role)?.element;
        console.log("userRole", userRole);
        return [
            el.id,
            el.username,
            el.email,
            userRole ? userRole : el.role,
            // userRole ? userRole : el.role,
            // el.role,
            <>
                <Link to={`/profile/${el.id}`} style={{ textDecoration: "none" }}>
                    <CustomButton
                        sx={{ borderRadius: 2, marginRight: 2 }}
                        label="View"
                    />

                </Link>
                <CustomButton
                    sx={{ borderRadius: 2, backgroundColor: "#cf5959",mr:2 }}
                    label="Remove"
                    onClick={() => handleRemoveWorkspaceMember(el.id)}
                    disabled={projectlist(el.id)}
                />
                 {projectlist(el.id) &&(
                 <CustomButton
                    sx={{ borderRadius: 2}}
                    label="Add"
                    onClick={() => handleRemoveFrozenUsers(el.id)}
                  />)}
            </>
        ]
    }) : [];

    const options = {
        textLabels: {
            body: {
                noMatch: "No records",
            },
            toolbar: {
                search: "Search",
                viewColumns: "View Column",
            },
            pagination: { rowsPerPage: "Rows per page" },
            options: { sortDirection: "desc" },
        },
        // customToolbar: fetchHeaderButton,
        displaySelectToolbar: false,
        fixedHeader: false,
        filterType: "checkbox",
        download: false,
        print: false,
        rowsPerPageOptions: [10, 25, 50, 100],
        // rowsPerPage: PageInfo.count,
        filter: false,
        // page: PageInfo.page,
        viewColumns: false,
        selectableRows: "none",
        search: false,
        jumpToPage: true,
    };

    return (
        <div>
            <Grid sx={{mb:1}}>
                <Search />
            </Grid>
            <ThemeProvider theme={tableTheme}>
                <MUIDataTable
                    // title={""}
                    data={data}
                    columns={columns}
                    options={options}
                />
            </ThemeProvider>
        </div>

    )
}

export default AnnotatorsTable;