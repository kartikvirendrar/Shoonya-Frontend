// DatasetReports

import React, { useState, useEffect } from "react";
import MUIDataTable from "mui-datatables";
import {
  Box,
  Button,
  Grid,
  ThemeProvider,
} from "@mui/material";
import tableTheme from "../../../theme/tableTheme";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import GetProjectDomainsAPI from "../../../../redux/actions/api/ProjectDetails/GetProjectDomains";
import GetDatasetProjectReportAPI from "../../../../redux/actions/api/Dataset/GetDatasetProjectReports";
import FetchLanguagesAPI from "../../../../redux/actions/api/UserManagement/FetchLanguages.js";
import APITransport from "../../../../redux/actions/apitransport/apitransport";
import DatasetStyle from "../../../styles/Dataset";
import ColumnList from "../common/ColumnList";
import { MenuProps } from "../../../../utils/utils";

const DatasetReports = () => {
  
  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [language, setLanguage] = useState("all");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [showSpinner, setShowSpinner] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportRequested, setReportRequested] = useState(false);
  const classes = DatasetStyle();

  const { datasetId } = useParams();
  const dispatch = useDispatch();
  const DatasetDetails = useSelector((state) => state.getDatasetDetails.data);
  const ProjectTypes = useSelector((state) => state.getProjectDomains.data);
  const DatasetReports = useSelector((state) => state.getDatasetProjectReports.data);
  const LanguageChoices = useSelector((state) => state.fetchLanguages.data);

  useEffect(() => {
    const typesObj = new GetProjectDomainsAPI();
    const langObj = new FetchLanguagesAPI();
    dispatch(APITransport(typesObj));
    dispatch(APITransport(langObj));
  }, []);

  useEffect(() => {
    if (ProjectTypes) {
      let types = [];
      Object.keys(ProjectTypes).forEach((key) => {
        let subTypes = Object.keys(ProjectTypes[key]["project_types"]);
        types.push(...subTypes);
      });
      setProjectTypes(types);
      setSelectedType(types[0]);
    }
  }, [ProjectTypes]);

  useEffect(() => {
    if (reportRequested && DatasetReports?.length) {
      let tempColumns = [];
      let tempSelected = [];
      Object.keys(DatasetReports[0]).forEach((key) => {
        tempColumns.push({
          name: key,
          label: key,
          options: {
            filter: false,
            sort: true,
            align: "center",
          },
        });
        tempSelected.push(key);
      });
      setColumns(tempColumns);
      setReportData(DatasetReports);
      setSelectedColumns(tempSelected);
    } else {
      setColumns([]);
      setReportData([]);
      setSelectedColumns([]);
    }
    setShowSpinner(false);
  }, [DatasetReports]);

  const renderToolBar = () => {
    return (
      <Box 
        className={classes.ToolbarContainer}
      >
        <ColumnList
          columns={columns}
          setColumns={setSelectedColumns}
          selectedColumns={selectedColumns}
        />
      </Box>
    );
  };

  const options = {
    filterType: "checkbox",
    selectableRows: "none",
    download: true,
    filter: false,
    print: false,
    search: false,
    viewColumns: false,
    jumpToPage: true,
    customToolbar: renderToolBar,
    textLabels: {
      body: {
        noMatch: "No Record Found",
      },
    },
  };

  const handleSubmit = () => {
    setReportRequested(true);
    const projectReportObj = new GetDatasetProjectReportAPI(
      datasetId,
      selectedType,
      language,
    );
    dispatch(APITransport(projectReportObj));
    setShowSpinner(true);
  };

  return (
    <React.Fragment>
      <Grid
        container
        direction="row"
        spacing={3}
        sx={{
          marginBottom: "24px",
        }}
      >
        <Grid
          item
          xs={12}
          sm={12}
          md={3}
          lg={3}
          xl={3}
        >
          <FormControl fullWidth size="small">
            <InputLabel id="project-type-label" sx={{ fontSize: "16px" }}>
              Project Type
            </InputLabel>
            <Select
              labelId="project-type-label"
              id="project-type-select"
              value={selectedType}
              label="Project Type"
              onChange={(e) => setSelectedType(e.target.value)}
              MenuProps={MenuProps}
            >
              {projectTypes.map((type, index) => (
                <MenuItem value={type} key={index}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={12} md={3} lg={3} xl={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="language-label" sx={{ fontSize: "16px" }}>
              Target Language
            </InputLabel>
            <Select
              labelId="language-label"
              id="language-select"
              value={language}
              label="Target Language"
              onChange={(e) => setLanguage(e.target.value)}
              MenuProps={MenuProps}
            >
              <MenuItem value={"all"}>All languages</MenuItem>
              {LanguageChoices.language?.map((lang) => (
                <MenuItem value={lang} key={lang}>
                  {lang}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={12} md={1} lg={1} xl={1}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{width:"130px"}}
          >
            Submit
          </Button>
        </Grid>
      </Grid>
      {showSpinner ? <div></div> : reportRequested && (
        <ThemeProvider theme={tableTheme}>
          <MUIDataTable
            title={DatasetReports.length > 0 ? "Reports" : ""}
            data={reportData}
            columns={columns.filter((col) => selectedColumns.includes(col.name))}
            options={options}
          />
        </ThemeProvider>)
      }
    </React.Fragment>
  );
};

export default DatasetReports;
