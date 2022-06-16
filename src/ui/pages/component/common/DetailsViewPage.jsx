import { Box, Card, Grid, Tab, Tabs, ThemeProvider, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import Header from "../../component/common/Header";
import themeDefault from '../../../theme/theme'
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from "../../component/common/Button"
import OutlinedTextField from "../../component/common/OutlinedTextField";
import DatasetStyle from "../../../styles/Dataset";
import TextareaAutosize from '@mui/material/TextareaAutosize';
import componentType from "../../../../config/pageType"
import ProjectTable from "../Tabs/ProjectTable";
import AnnotatorsTable from "../Tabs/Annotators";
import ManagersTable from "../Tabs/ManagersTable";
import Workspaces from "../Tabs/Workspaces";
import CustomButton from "../../component/common/Button";
import { translate } from "../../../../config/localisation";
import MembersTable from "../Project/MembersTable";
import Members from "../Tabs/Members";
import Invites from "../Tabs/Invites";

function TabPanel(props) {

    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}


const DetailsViewPage = (props) => {
    const { pageType, title, createdBy } = props;
    const classes = DatasetStyle();
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    // const workspaceData = useSelector(state=>state.getWorkspaces.data);
    // const getDashboardWorkspaceData = ()=>{
    //     const workspaceObj = new GetWorkspacesAPI(1);
    //     dispatch(APITransport(workspaceObj));
    //   }

    useEffect(() => {
        // getDashboardWorkspaceData();
    }, []);


    return (
        <ThemeProvider theme={themeDefault}>
            <Grid
                container
                direction='row'
                justifyContent='center'
                alignItems='center'
            >
                <Card className={classes.workspaceCard}>
                    <Typography variant="h2" gutterBottom component="div">
                        {title}
                    </Typography>
                    <Typography variant="body1" gutterBottom component="div">
                        Created_by : {createdBy}
                    </Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">

                            {pageType === componentType.Type_Workspace && <Tab label="Projects" sx={{ fontSize: 16, fontWeight: '700' }} />}
                            {pageType === componentType.Type_Organization && <Tab label="Workspaces" sx={{ fontSize: 16, fontWeight: '700' }} />}

                            {pageType === componentType.Type_Workspace && <Tab label="Annotators" sx={{ fontSize: 16, fontWeight: '700' }} />}
                            {pageType === componentType.Type_Organization && <Tab label="Members" sx={{ fontSize: 16, fontWeight: '700' }} />}


                            {pageType === componentType.Type_Workspace && <Tab label="Managers" sx={{ fontSize: 16, fontWeight: '700' }} />}
                            {pageType === componentType.Type_Organization && <Tab label="Invites" sx={{ fontSize: 16, fontWeight: '700' }} />}

                            <Tab label="Settings" sx={{ fontSize: 16, fontWeight: '700' }} />
                        </Tabs>
                    </Box>
                    <TabPanel value={value} index={0} style={{ textAlign: "center" }}>
                        {pageType === componentType.Type_Workspace && <>
                            <Link to={`/create-annotation-project/1`} style={{ textDecoration: "none", marginRight: "200px" }}>
                                <Button className={classes.projectButton} label={"Add New Annotation Project"} />
                            </Link>
                            <Link to={`/create-collection-project/1`}  style={{ textDecoration: "none" }}>
                            <Button className={classes.projectButton} label={"Add New Collection Project"} /></Link>
                            <div className={classes.workspaceTables} >
                                <ProjectTable />
                            </div>
                        </>}
                        {pageType === componentType.Type_Organization &&
                            <>
                                <CustomButton label={translate("button.addNewWorkspace")} sx={{ width: "100%", mb: 2 }} />
                                <Workspaces />
                            </>
                        }
                        
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        {pageType === componentType.Type_Workspace &&
                            <>
                                <Button className={classes.annotatorsButton} label={"Add Annotators to Workspace"} />
                                <AnnotatorsTable />
                            </>
                        }
                        {pageType === componentType.Type_Organization &&
                            <>
                                <CustomButton label={translate("button.inviteNewMEmbersToOrganization")} sx={{ width: "100%", mb: 2 }} />
                                <Members />
                            </>
                        }
                    </TabPanel>
                    <TabPanel value={value} index={2}>
                            {pageType === componentType.Type_Workspace && 
                                <>
                                    <CustomButton label={"Assign Managers"} sx={{ width: "100%", mb: 2 }} />
                                    <ManagersTable />
                                </>
                            }
                            {pageType === componentType.Type_Organization && <Invites />}
                    </TabPanel>
                    <TabPanel value={value} index={3}>
                        <Button className={classes.settingsButton} label={"Archive Workspace"} />
                    </TabPanel>
                </Card>
            </Grid>
        </ThemeProvider>

    )
}

export default DetailsViewPage;