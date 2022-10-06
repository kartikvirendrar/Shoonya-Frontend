import { Button, Grid, ThemeProvider, Select, Box, MenuItem, InputLabel, FormControl, Card, Typography } from "@mui/material";
//import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import themeDefault from "../../../theme/theme";
import DatasetStyle from "../../../styles/Dataset";
import PeriodicalTasks from "../../../../redux/actions/api/Progress/PeriodicalTasks";
import CumulativeTasksAPI from "../../../../redux/actions/api/Progress/CumulativeTasks";
import LightTooltip from '../../component/common/Tooltip'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,

} from 'chart.js';
import { styled } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import faker from 'faker';
import GetProjectDomainsAPI from "../../../../redux/actions/api/ProjectDetails/GetProjectDomains";
import APITransport from "../../../../redux/actions/apitransport/apitransport";
// import CustomizedSnackbars from "../common/Snackbar";
import Spinner from "../../component/common/Spinner";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import { isSameDay, format } from 'date-fns/esm';
import {
  DateRangePicker,
  defaultStaticRanges,
  createStaticRanges
} from "react-date-range";
import { useTheme } from "@material-ui/core/styles";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { addDays } from 'date-fns';
import colorsData from '../../../../utils/Colors_JSON/Colors_JSON';
import axios from "axios";
import html2canvas from 'html2canvas';
import { jsPDF } from "jspdf";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,

);

ChartJS.register(CategoryScale);

// const LightTooltip = styled(({ className, ...props }) => (
//   <Tooltip {...props} classes={{ popper: className }} />
// ))(({ theme }) => ({
//   [`& .${tooltipClasses.tooltip}`]: {
//     backgroundColor: theme.palette.common.white,
//     color: 'rgba(0, 0, 0, 0.87)',
//     boxShadow: theme.shadows[1],
//     fontSize: 11,
//   },
// }));

const footer = (tooltipItems) => {
  let sum = 0;

  tooltipItems.forEach(function (tooltipItem) {
    sum += tooltipItem.parsed.y;
  });
  return 'Sum: ' + sum;
};

export const options = {
  responsive: true,
  scales: {
    x: {
      // stacked: true,
      display: true,
      title: {
        display: true,
        text: 'Language',
        color: 'black',
        font: {
          family: 'Roboto',
          size: 16,
          weight: 'bold',
          lineHeight: 1.2,
        },
        padding: { top: 20, left: 0, right: 0, bottom: 0 }
      }
    },
    y: {
      // stacked: true,
      display: true,
      title: {
        display: true,
        text: '# Annotations Completed ',
        // text:'Count',
        color: '#black',
        font: {
          family: 'Roboto',
          size: 16,
          style: 'normal',
          weight: 'bold',
          lineHeight: 1.2,
          paddingBottom: "100px",
        },
        padding: { top: 30, left: 0, right: 0, bottom: 20 }
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: {
      position: 'bottom',
    },
    title: {
      display: true,
      // text: 'Chart.js Bar Chart',
    },
    tooltip: {
      callbacks: {
        footer: footer,
        label: function(context) {
          let label = context.dataset.label || '';
          let dataVal = context.parsed.y;

          if(dataVal && dataVal !== 0 && dataVal !== null){
            label += " : " + new Intl.NumberFormat('en-US').format(dataVal);
          } else {
             label = ""
          }
          return label;
      }
      },

    }
  },
};
const TooltipData = [{ name: "Progress chart based on one data selection" }, { name: "Compares progress of two different data selections" }]
const ProgressTypedata = [{ title: "Complete progress for annotations done till date" }, { title: "Monthly stacked progress in selected span of months" }, { title: "Weekly stacked progress in selected span of weeks" }]
const ChartType = [{ chartTypename: "Individual" }, { chartTypename: "Comparison" }]
const ProgressType = [{ ProgressTypename: "Cumulative" }, { ProgressTypename: "monthly" }, { ProgressTypename: "weekly" }]
const avilableChartType = {
  Individual: "Individual",
  Comparison: "Comparison"
}
function ProgressList() {
  const dispatch = useDispatch();
  const classes = DatasetStyle();
  const [projectTypes, setProjectTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [chartTypes, setChartTypes] = useState("Individual")
  const [progressTypes, setProgressTypes] = useState("Cumulative")
  const [showBarChar, setShowBarChar] = useState(false)
  const [showPicker, setShowPicker] = useState(false);
  const [showPickers, setShowPickers] = useState(false);
  const [comparisonProgressTypes, setComparisonProgressTypes] = useState("");
  const [monthvalue, setmonthvalue] = useState([])
  const [weekvalue, setweekvalue] = useState([])
  const [loading, setLoading] = useState(false);
  const [yearvalue, setyearvalue] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [SVGChartData, setSVGChartData] = useState([]);
  const theme = useTheme();
  const [state, setState] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      key: 'selection'
    }
  ]);
  const [states, setStates] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      key: 'selection'
    }
  ]);
  const ProjectTypes = useSelector((state) => state.getProjectDomains.data);
  const userDetails = useSelector((state) => state.fetchLoggedInUserData.data);

  const [CumulativeTasksData, setCumulativeTasksData] = useState([]);
  const [PeriodicalTaskssData, setPeriodicalTaskssData] = useState([]);
  const [SecondaryPeriodicalTaskssData, setSecondaryPeriodicalTaskssData] = useState([]);


  // const CumulativeTasksData = useSelector((state) => state?.getCumulativeTasks?.data)
  // const PeriodicalTaskssData = useSelector((state) => state?.getPeriodicalTasks?.data)
  const apiLoading = useSelector(state => state.apiStatus.loading);

  useEffect(() => {
    if (PeriodicalTaskssData.length > 0) {
      if (PeriodicalTaskssData[0].month_number > 0) {
        setmonthvalue(PeriodicalTaskssData[0])
      }
      else if (PeriodicalTaskssData[0].week_number > 0) {
        setweekvalue(PeriodicalTaskssData[0])
      }
      else if (PeriodicalTaskssData[0].year_number > 0) {
        setyearvalue(PeriodicalTaskssData[0])
      }
    }
  }, [PeriodicalTaskssData])


  useEffect(() => {
    if (ProjectTypes) {
      let types = [];
      Object.keys(ProjectTypes).forEach((key) => {
        let subTypes = Object.keys(ProjectTypes[key]["project_types"]);
        types.push(...subTypes);
      });
      setProjectTypes(types);
      types?.length && setSelectedType(types[3]);
    }
  }, [ProjectTypes]);

  useEffect(() => {
    const typesObj = new GetProjectDomainsAPI();
    dispatch(APITransport(typesObj));
  }, []);


  // useEffect(() => {
  //   setLoading(false);
  // }, [yearvalue, PeriodicalTaskssData, CumulativeTasksData])


  const handleChartType = (e) => {
    setChartTypes(e.target.value)
  }

  const getCumulativeTasksData = async (payload, OrgId) => {
    setLoading(true);
    console.log("payload, OrgId", payload, OrgId);
    const cumulativeTasksAPIObj = new CumulativeTasksAPI(payload, OrgId);
    await axios.post(cumulativeTasksAPIObj.apiEndPoint(), cumulativeTasksAPIObj.getBody(), cumulativeTasksAPIObj.getHeaders())
      .then(response => {
        if (response.statusText === "OK") {
          setCumulativeTasksData(response.data);
          setLoading(false);
          console.log("CumulativeTasksData -----", response);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        setLoading(false);
        console.log("err - ", err);
      })
  }

  const getPeriodicalTasksData = async (payload, OrgId) => {
    setLoading(true);
    console.log("payload, OrgId", payload, OrgId);
    const periodicalTasksAPIObj = new PeriodicalTasks(payload, OrgId);
    await axios.post(periodicalTasksAPIObj.apiEndPoint(), periodicalTasksAPIObj.getBody(), periodicalTasksAPIObj.getHeaders())
      .then(response => {
        if (response.statusText === "OK") {
          setPeriodicalTaskssData(response.data);
          setLoading(false);
          console.log("PeriodicalTaskssData -----", response);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        setLoading(false);
        console.log("err - ", err);
      })
  }

  const getSecondaryPeriodicalTasksData = async (payload, OrgId) => {
    setLoading(true);
    console.log("payload, OrgId", payload, OrgId);
    const periodicalTasksAPIObj = new PeriodicalTasks(payload, OrgId);
    await axios.post(periodicalTasksAPIObj.apiEndPoint(), periodicalTasksAPIObj.getBody(), periodicalTasksAPIObj.getHeaders())
      .then(response => {
        if (response.statusText === "OK") {
          setSecondaryPeriodicalTaskssData(response.data);
          setLoading(false);
          console.log("PeriodicalTaskssData -----", response);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        setLoading(false);
        console.log("err - ", err);
      })
  }

  const handleSubmit = async () => {
    const OrgId = userDetails.organization.id
    setShowPicker(false);
    setShowPickers(false);
    // setLoading(true);

    const Cumulativedata = {
      project_type: selectedType,
    };
    const individualPeriodicaldata = {
      project_type: selectedType,
      periodical_type: progressTypes,
      start_date: format(state[0].startDate, 'yyyy-MM-dd'),
      end_date: format(state[0].endDate, 'yyyy-MM-dd'),
    };

    if (chartTypes === avilableChartType.Individual) {

      if (progressTypes === "Cumulative") {
        await getCumulativeTasksData(Cumulativedata, OrgId);
        // const progressObj = new CumulativeTasksAPI(Cumulativedata, OrgId);
        // dispatch(APITransport(progressObj))
      }
      else {
        await getPeriodicalTasksData(individualPeriodicaldata, OrgId)
        // const progressObj = new PeriodicalTasks(individualPeriodicaldata, OrgId);
        // dispatch(APITransport(progressObj));
      }


    }
    else {

      if (comparisonProgressTypes === "Cumulative" && progressTypes === "Cumulative") {

        await getCumulativeTasksData(Cumulativedata, OrgId);

      } else if (comparisonProgressTypes !== "Cumulative" && progressTypes === "Cumulative") {

        const Periodicaldata = {
          project_type: selectedType,
          periodical_type: comparisonProgressTypes,
          start_date: format(states[0].startDate, 'yyyy-MM-dd'),
          end_date: format(states[0].endDate, 'yyyy-MM-dd'),
        };
        await getPeriodicalTasksData(Periodicaldata, OrgId);
        await getCumulativeTasksData(Cumulativedata, OrgId);

      } else if (comparisonProgressTypes === "Cumulative" && progressTypes !== "Cumulative") {
        const individualPeriodicaldata = {
          project_type: selectedType,
          periodical_type: progressTypes,
          start_date: format(state[0].startDate, 'yyyy-MM-dd'),
          end_date: format(state[0].endDate, 'yyyy-MM-dd'),
        };
        await getPeriodicalTasksData(individualPeriodicaldata, OrgId);
        await getCumulativeTasksData(Cumulativedata, OrgId);
      } else {
        const basePeriodicalPayload = {
          project_type: selectedType,
          periodical_type: comparisonProgressTypes,
          start_date: format(states[0].startDate, 'yyyy-MM-dd'),
          end_date: format(states[0].endDate, 'yyyy-MM-dd'),
        };
        const comparisonPeriodicalPayload = {
          project_type: selectedType,
          periodical_type: progressTypes,
          start_date: format(state[0].startDate, 'yyyy-MM-dd'),
          end_date: format(state[0].endDate, 'yyyy-MM-dd'),
        };

        await getPeriodicalTasksData(basePeriodicalPayload, OrgId);
        await getSecondaryPeriodicalTasksData(comparisonPeriodicalPayload, OrgId);

      }

      // if (comparisonProgressTypes === "Cumulative") {
      //   getCumulativeTasksData(Cumulativedata, OrgId);
      //   // const progressObj = new CumulativeTasksAPI(Cumulativedata, OrgId);
      //   // dispatch(APITransport(progressObj))


      // } else {
      //   const Periodicaldata = {
      //     project_type: selectedType,
      //     periodical_type: comparisonProgressTypes,
      //     start_date: format(states[0].startDate, 'yyyy-MM-dd'),
      //     end_date: format(states[0].endDate, 'yyyy-MM-dd'),
      //   };
      //   getPeriodicalTasksData(Periodicaldata, OrgId)
      //   // const progressObj = new PeriodicalTasks(Periodicaldata, OrgId);
      //   // dispatch(APITransport(progressObj));
      // }
      // if (progressTypes === "Cumulative") {
      //   getCumulativeTasksData(Cumulativedata, OrgId);
      //   // const progressObj = new CumulativeTasksAPI(Cumulativedata, OrgId);
      //   // dispatch(APITransport(progressObj))
      // }
      // else {
      //   const individualPeriodicaldata = {
      //     project_type: selectedType,
      //     periodical_type: progressTypes,
      //     start_date: format(state[0].startDate, 'yyyy-MM-dd'),
      //     end_date: format(state[0].endDate, 'yyyy-MM-dd'),
      //   };
      //   getPeriodicalTasksData(individualPeriodicaldata, OrgId)
      //   // const progressObj = new PeriodicalTasks(individualPeriodicaldata, OrgId);
      //   // dispatch(APITransport(progressObj));
      // }
    }

    await handleSwitchBarChartShow();

    // setLoading(false);

  }

  const handleSwitchBarChartShow = async () => {
    setShowBarChar(true);
  }

  const handleProgressType = (e) => {
    setProgressTypes(e.target.value)

  }
  const handledatecomparisionprogress = () => {
    setShowPickers(!showPickers)



  }
  const handleDateRangePicker = (item) => {
    setStates([item.selection])



  }
  const handleComparisonProgressType = (e) => {
    setComparisonProgressTypes(e.target.value)

  }

  useEffect(() => {
    let chData;
    let svgChData;
    if (chartTypes === avilableChartType.Individual) {
      if (progressTypes === "Cumulative") {
        // console.log("CumulativeTasksData - ", CumulativeTasksData);
        // debugger
        svgChData = CumulativeTasksData.map((el, i) => {
          return {
            name: el.language,
            value: el.cumulative_tasks_count,
            // stack: el.language
          }
        })
        const labels = CumulativeTasksData && CumulativeTasksData.map((el, i) => el.language)
        chData = {
          labels,
          datasets: [
            {
              label: progressTypes,
              data: CumulativeTasksData.map((e) => (e.cumulative_tasks_count)),
              stack: "stack 0",
              backgroundColor: colorsData.orange[0].color,
              barThickness: 25,
            },
          ],

        };
      } else {
        const labels = PeriodicalTaskssData[0]?.data && PeriodicalTaskssData[0]?.data.map((el, i) => el.language);
        svgChData = PeriodicalTaskssData.map((el, i) => {
          return {
            name: el.date_range,
            value: el.data,
          }
        })
        console.log("PeriodicalTaskssData - ", PeriodicalTaskssData);
        // debugger
        chData = {
          labels,
          datasets:
            PeriodicalTaskssData?.map((el, i) => {
              return {
                label: `${progressTypes} (${el.date_range})`,
                data: el.data?.map((e) => (e.annotations_completed)),
                stack: "stack 0",
                backgroundColor: colorsData.green[i].color,
                barThickness: 20,
              }
            }),

        };
        // console.log("data data - ", data);
      }

    } else {
      if (progressTypes !== "Cumulative" && progressTypes === comparisonProgressTypes) {
        const labels = PeriodicalTaskssData[0]?.data && PeriodicalTaskssData[0]?.data.map((el, i) => el.language);
        const PeriodicalTaskssDataset = PeriodicalTaskssData?.map((el, i) => {
          return {
            label: `${progressTypes} (${el.date_range})`,
            data: el.data?.map((e) => (e.annotations_completed)),
            stack: "stack 0",
            backgroundColor: colorsData.green[i].color,
            barThickness: 20,
          }
        });

        const SecondaryPeriodicalTaskssDataset = SecondaryPeriodicalTaskssData?.map((el, i) => {
          return {
            label: `${comparisonProgressTypes} (${el.date_range})`,
            data: el.data?.map((e) => (e.annotations_completed)),
            stack: "stack 1",
            backgroundColor: colorsData.orange[i].color,
            barThickness: 20,
          }
        });
        chData = {
          labels,
          datasets: PeriodicalTaskssDataset.concat(SecondaryPeriodicalTaskssDataset),
        };
      } else if (progressTypes !== "Cumulative" && progressTypes != comparisonProgressTypes) {
        const labels = PeriodicalTaskssData[0]?.data && PeriodicalTaskssData[0]?.data.map((el, i) => el.language);
        const PeriodicalTaskssDataset = PeriodicalTaskssData?.map((el, i) => {
          return {
            label: `${progressTypes} (${el.date_range})`,
            data: el.data?.map((e) => (e.annotations_completed)),
            stack: "stack 0",
            backgroundColor: colorsData.green[i].color,
            barThickness: 20,
          }
        });

        const SecondaryPeriodicalTaskssDataset = SecondaryPeriodicalTaskssData?.map((el, i) => {
          return {
            label: `${comparisonProgressTypes} (${el.date_range})`,
            data: el.data?.map((e) => (e.annotations_completed)),
            stack: "stack 1",
            backgroundColor: colorsData.orange[i].color,
            barThickness: 20,
          }
        });
        chData = {
          labels,
          datasets: PeriodicalTaskssDataset.concat(SecondaryPeriodicalTaskssDataset),
        };
      } else {

        const labels = progressTypes === "Cumulative" ? CumulativeTasksData.map((e) => (e.language)) : progressTypes === "weekly" ? weekvalue?.data?.map((e) => e.language) : progressTypes === "monthly" ? monthvalue?.data?.map((e) => e.language) : yearvalue?.data?.map((e) => e.language)

        chData = {
          labels,
          datasets: [

            {

              label: progressTypes,
              data: progressTypes === "Cumulative" ? CumulativeTasksData.map((e) => (e.cumulative_tasks_count)) : progressTypes === "weekly" ? weekvalue?.data?.map((e) => e.annotations_completed) : progressTypes === "monthly" ? monthvalue?.data?.map((e) => e.annotations_completed) : yearvalue?.data?.map((e) => e.annotations_completed),
              //data :progressTypes === "monthly" ? monthvalue?.data?.map((e) => e.annotations_completed):[],
              stack: "stack 0",
              backgroundColor: "rgba(243, 156, 18 )",
              barThickness: 20,
            },
            {
              label: comparisonProgressTypes,
              data: comparisonProgressTypes === "Cumulative" ? CumulativeTasksData.map((e) => (e.cumulative_tasks_count)) : comparisonProgressTypes === "weekly" ? weekvalue?.data?.map((e) => e.annotations_completed) : comparisonProgressTypes === "monthly" ? monthvalue?.data?.map((e) => e.annotations_completed) : yearvalue?.data?.map((e) => e.annotations_completed),
              //data :comparisonProgressTypes === "monthly" ? monthvalue?.data?.map((e) => e.annotations_completed):[],
              stack: "stack 0",
              backgroundColor: 'rgba(35, 155, 86 )',
              barThickness: 20,
            },

          ],

        };

      }

      // console.log(data, "vvvv",)



    }
    setChartData(chData);
    setSVGChartData(svgChData);
  }, [PeriodicalTaskssData, SecondaryPeriodicalTaskssData, CumulativeTasksData])

  const downloadReportClick = (type) => {
    const srcElement = document.getElementById('chart-container');
    html2canvas(srcElement)
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');

        if (type === "img") {
          let anchorEle = document.createElement("a");
          anchorEle.href = imgData;
          anchorEle.download = "Image.png";
          anchorEle.click();
        } else if (type === "pdf") {
          const pdf = new jsPDF();
          pdf.addImage(imgData, 'JPEG', 10, 10, 180, 150);
          // pdf.output('dataurlnewwindow');
          pdf.save("download.pdf");
        }

      })
  }

  var now = new Date()
  var currentYear = now.getFullYear()


  const ToolTipdata1 = TooltipData.map((el, i) => el.name);
  console.log(ToolTipdata1, "ToolTipdata1")

  return (
    <ThemeProvider theme={themeDefault}>
      {loading && <Spinner />}
      <Card
        sx={{
          width: "100%",
          minHeight: 500,
          padding: 5
        }}
      >

        <Box >
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Grid> <Typography variant="h3" component="h2" sx={{ paddingBottom: "7px" }}> Bar Chart Analytics</Typography></Grid>
            <Grid container columnSpacing={3} rowSpacing={2} mt={1} mb={1}>

              <Grid item xs={12} sm={12} md={3} lg={3} xl={3}>
                <FormControl fullWidth size="small" >
                  <InputLabel id="Graph-Type-label" sx={{ fontSize: "16px" }}>
                    Analytics Type
                  </InputLabel>

                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    label="Select Graph Type"
                    value={chartTypes}
                    onChange={handleChartType}
                  >

                    {ChartType.map((item, index) => (



                      <LightTooltip title={TooltipData[index].name} key={index} value={item.chartTypename} placement="left" arrow>
                        <MenuItem value={item.chartTypename}>{item.chartTypename}</MenuItem>
                      </LightTooltip>
                    ))}

                  </Select>
                </FormControl>
              </Grid>


              <Grid item xs={12} sm={12} md={3} lg={3} xl={3}>
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
                  >
                    {projectTypes.map((type, index) => (
                      <MenuItem value={type} key={index}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={6} md={2} lg={2} xl={2}
              >
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={(progressTypes || comparisonProgressTypes) ? false : true}
                >
                  Submit
                </Button>
              </Grid>
            </Grid>

          </Grid>
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Grid container columnSpacing={2} rowSpacing={2} mt={1} mb={1}>
              {(chartTypes === avilableChartType.Individual || chartTypes === avilableChartType.Comparison) && <Grid item xs={12} sm={12} md={3} lg={3} xl={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="project-type-label" sx={{ fontSize: "16px", color: "rgba(243, 156, 18 )" }}>
                    Base period
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    label="Select Progress Type"
                    value={progressTypes}
                    onChange={handleProgressType}
                  >


                    {ProgressType.map((item, index) => (

                      <LightTooltip title={ProgressTypedata[index].title} value={item.ProgressTypename} key={index} placement="left" arrow >
                        <MenuItem value={item.ProgressTypename} key={index} sx={{ textTransform: "capitalize" }}>{item.ProgressTypename}</MenuItem>
                      </LightTooltip>
                    ))}
                  </Select>
                </FormControl>
              </Grid>}
              {!(progressTypes === "Cumulative" || chartTypes === "") && <Grid item xs={2} sm={2} md={2} lg={2} xl={2}  >



                <Button
                  endIcon={showPicker ? <ArrowRightIcon /> : <ArrowDropDownIcon />}
                  variant="contained"
                  color="primary"
                  onClick={() => setShowPicker(!showPicker)}
                  sx={{ backgroundColor: "rgba(243, 156, 18)", "&:hover": { backgroundColor: "rgba(243, 156, 18 )", }, marginLeft: "20px" }}

                >
                  Pick Dates
                </Button>
              </Grid>}
              {chartTypes === avilableChartType.Comparison && <Grid item xs={12} sm={12} md={3} lg={3} xl={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="project-type-label" sx={{ fontSize: "16px", color: "rgba(35, 155, 86 )" }}>
                    Comparison Period
                  </InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    label="Select Progress Type"
                    onChange={handleComparisonProgressType}
                  >
                    {ProgressType.map((item, index) => (
                      <LightTooltip title={ProgressTypedata[index].title} value={item.ProgressTypename} key={index} placement="right" arrow >
                        <MenuItem value={item.ProgressTypename} key={index} sx={{ textTransform: "capitalize" }}>{item.ProgressTypename}</MenuItem>
                      </LightTooltip>

                    ))}
                  </Select>
                </FormControl>
              </Grid>}
              {!(comparisonProgressTypes === "Cumulative" || chartTypes === "" || chartTypes === avilableChartType.Individual) && <Grid item xs={2} sm={2} md={2} lg={2} xl={2} >
                <Button
                  endIcon={showPickers ? <ArrowRightIcon /> : <ArrowDropDownIcon />}
                  variant="contained"
                  color="primary"
                  onClick={handledatecomparisionprogress}
                  sx={{ backgroundColor: "rgba(35, 155, 86 )", "&:hover": { backgroundColor: "rgba(35, 155, 86 )", }, marginLeft: "20px" }}
                >
                  Pick Dates
                </Button>
              </Grid>}

              {showPicker && <Box sx={{ mt: 2, mb: 2, display: "flex", justifyContent: "center", width: "100%" }}>
                <Card sx={{ overflowX: "scroll" }}>
                  <DateRangePicker
                    onChange={item => setState([item.selection])}
                    inputRanges={[]}
                    staticRanges={[
                      ...defaultStaticRanges,
                      {
                        label: "This Year",
                        range: () => ({
                          startDate: new Date(Date.parse(currentYear, 'yyyy-MM-ddTHH:mm:ss.SSSZ')),
                          endDate: new Date(),
                        }),
                        isSelected(range) {
                          const definedRange = this.range();
                          return (
                            isSameDay(range.startDate, definedRange.startDate) &&
                            isSameDay(range.endDate, definedRange.endDate)
                          );
                        }
                      },
                      {
                        label: "Last Year",
                        range: () => ({
                          startDate: new Date(Date.parse(currentYear - 1, 'yyyy-MM-ddTHH:mm:ss.SSSZ')),
                          endDate: new Date(Date.parse(currentYear, 'yyyy-MM-ddTHH:mm:ss.SSSZ')),
                        }),
                        isSelected(range) {
                          const definedRange = this.range();
                          return (
                            isSameDay(range.startDate, definedRange.startDate) &&
                            isSameDay(range.endDate, definedRange.endDate)
                          );
                        }
                      },
                    ]}
                    showSelectionPreview={true}
                    moveRangeOnFirstSelection={false}
                    showMonthAndYearPickers={true}
                    months={2}
                    ranges={state}
                    direction="horizontal"
                    preventSnapRefocus={true}
                    // calendarFocus="backwards"
                    weekStartsOn={2}

                  />
                </Card>
              </Box>}
              {showPickers && <Box sx={{ mt: 2, mb: 2, display: "flex", justifyContent: "center", width: "100%" }}>
                <Card sx={{ overflowX: "scroll" }}>
                  <DateRangePicker
                    onChange={handleDateRangePicker} item
                    inputRanges={[]}
                    staticRanges={[
                      ...defaultStaticRanges,
                      {
                        label: "This Year",
                        range: () => ({
                          startDate: new Date(Date.parse(currentYear, 'yyyy-MM-ddTHH:mm:ss.SSSZ')),
                          endDate: new Date(),
                        }),
                        isSelected(range) {
                          const definedRange = this.range();

                          return (
                            isSameDay(range.startDate, definedRange.startDate) &&
                            isSameDay(range.endDate, definedRange.endDate)
                          );
                        }
                      },
                      {
                        label: "Last Year",
                        range: () => ({
                          startDate: new Date(Date.parse(currentYear - 1, 'yyyy-MM-ddTHH:mm:ss.SSSZ')),
                          endDate: new Date(Date.parse(currentYear, 'yyyy-MM-ddTHH:mm:ss.SSSZ') - 86400000),
                        }),
                        isSelected(range) {
                          const definedRange = this.range();
                          return (
                            isSameDay(range.startDate, definedRange.startDate) &&
                            isSameDay(range.endDate, definedRange.endDate)
                          );
                        }
                      },
                    ]}
                    showSelectionPreview={true}
                    moveRangeOnFirstSelection={false}
                    showMonthAndYearPickers={true}
                    months={2}
                    ranges={states}
                    direction="horizontal"
                    preventSnapRefocus={true}
                    // calendarFocus="backwards"
                    weekStartsOn={2}

                  />
                </Card>
              </Box>}
            </Grid>

          </Grid>
          {showBarChar &&
            <>
              <Grid container justifyContent="end">
                <Button onClick={() => downloadReportClick("pdf")}>
                  Download Report As PDF
                </Button>
                <Button onClick={() => downloadReportClick("img")}>
                  Download Report As Image
                </Button>
              </Grid>

              <div id="chart-container">
                <Bar options={options} data={chartData} />
              </div>
            </>
          }
        </Box>
      </Card>
    </ThemeProvider>
  )
}
export default ProgressList;