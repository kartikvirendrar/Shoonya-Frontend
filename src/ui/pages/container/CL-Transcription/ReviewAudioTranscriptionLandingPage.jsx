// AudioTranscriptionLandingPage
import ReactQuill, { Quill } from 'react-quill';
import "../../../../ui/pages/container/Label-Studio/cl_ui.css"
import 'quill/dist/quill.bubble.css';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";
import TranscriptionRightPanel from "./TranscriptionRightPanel";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Grid,
  Button,
  TextField,
} from "@mui/material";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import Timeline from "./TimeLine";
import AudioPanel from "./AudioPanel";
import AudioTranscriptionLandingStyle from "../../../styles/AudioTranscriptionLandingStyle";
import APITransport from "../../../../redux/actions/apitransport/apitransport";
import GetAnnotationsTaskAPI from "../../../../redux/actions/CL-Transcription/GetAnnotationsTask";
import GetProjectDetailsAPI from "../../../../redux/actions/api/ProjectDetails/GetProjectDetails";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Spinner from "../../component/common/Spinner";
import Sub from "../../../../utils/Sub";
import C from "../../../../redux/constants";
import SaveTranscriptAPI from "../../../../redux/actions/CL-Transcription/SaveTranscript";
import { setSubtitles } from "../../../../redux/actions/Common";
import PatchAnnotationAPI from "../../../../redux/actions/CL-Transcription/patchAnnotation";
import CustomizedSnackbars from "../../component/common/Snackbar";
import GetNextProjectAPI from "../../../../redux/actions/CL-Transcription/GetNextProject";
import GetTaskDetailsAPI from "../../../../redux/actions/api/Tasks/GetTaskDetails";
import ReviewStageButtons from "../../component/CL-Transcription/ReviewStageButtons";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";


const ReviewAudioTranscriptionLandingPage = () => {
  const classes = AudioTranscriptionLandingStyle();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  let location = useLocation();
  const { projectId, taskId } = useParams();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentSubs, setCurrentSubs] = useState();
  const [loadtime, setloadtime] = useState(new Date());
  const [textBox, settextBox] = useState("");
  const [NextData, setNextData] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [annotationNotesValue, setAnnotationNotesValue] = useState(null);
  const [disableSkip, setdisableSkip] = useState(false);
  const [annotationtext,setannotationtext] = useState('')
  const [reviewtext,setreviewtext] = useState('')
  const [supercheckertext,setsupercheckertext] = useState('')
  const [filterMessage, setFilterMessage] = useState(null);
  const [disableBtns, setDisableBtns] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [stdTranscription, setStdTranscription] = useState("");
  const [showStdTranscript, setShowStdTranscript] = useState(false);
  const [stdTranscriptionSettings, setStdTranscriptionSettings] = useState({
    enable: false,
    showAcoustic: false,
    rtl: false,
    enableTransliteration: false,
    enableTransliterationSuggestion: false,
    targetlang: "en",
    fontSize: "Normal"
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [speakerBox, setSpeakerBox] = useState("");
  const[taskDetailList,setTaskDetailList] = useState("")
  const [snackbar, setSnackbarInfo] = useState({
    open: false,
    message: "",
    variant: "success",
  });
  let labellingMode = localStorage.getItem("labellingMode");
  // const subs = useSelector((state) => state.commonReducer.subtitles);
  const result = useSelector((state) => state.commonReducer.subtitles);

  const AnnotationsTaskDetails = useSelector(
    (state) => state.getAnnotationsTask.data
  );
  const ProjectDetails = useSelector((state) => state.getProjectDetails?.data);
  const taskDetails = useSelector((state) => state.getTaskDetails?.data);
  const user = useSelector((state) => state.fetchLoggedInUserData.data);
  const player = useSelector((state) => state.commonReducer.player);
  const ref = useRef(0);
  const saveIntervalRef = useRef(null);
  const timeSpentIntervalRef = useRef(null);
  const annotationNotesRef = useRef(null);
  const reviewNotesRef = useRef(null);
  const superCheckerNotesRef = useRef(null);
  const [advancedWaveformSettings, setAdvancedWaveformSettings] = useState(false);


  // useEffect(() => {
  //   let intervalId;

  //   const updateTimer = () => {
  //     ref.current = ref.current + 1;
  //   };

  //   intervalId = setInterval(updateTimer, 1000);

  //   setInterval(() => {
  //     clearInterval(intervalId);
  //     ref.current = 0;

  //     intervalId = setInterval(updateTimer, 1000);
  //   }, 60 * 1000);

  //   return () => {
  //     const apiObj = new UpdateTimeSpentPerTask(taskId, ref.current);
  //     dispatch(APITransport(apiObj));
  //     clearInterval(intervalId);
  //     ref.current = 0;
  //   };
  // }, []);

  const filterAnnotations = (annotations, user, taskData) => {
    let filteredAnnotations = annotations;
    let userAnnotation = annotations.find((annotation) => {
      return (
        annotation.completed_by === user.id && annotation.parent_annotation
      );
    });
    let disable = false;
    let disableSkip = false;
    let disablebtn = false;
    let disableButton = false;
    let filterMessage = "";
    let userAnnotationData = annotations.find(
      (annotation) => annotation.annotation_type === 3
    );
    if (userAnnotation) {
      if (userAnnotation.annotation_status === "unreviewed") {
        filteredAnnotations =
          userAnnotation.result.length > 0 &&
            !taskData?.revision_loop_count?.review_count
            ? [userAnnotation]
            : annotations.filter(
              (annotation) =>
                annotation.id === userAnnotation.parent_annotation &&
                annotation.annotation_type === 1
            );
        console.log(
          filteredAnnotations,
          "filteredAnnotationsfilteredAnnotations"
        );
      } else if (
        userAnnotation &&
        ["rejected"].includes(userAnnotation.annotation_status)
      ) {
        filteredAnnotations = [userAnnotation];
        disableSkip = true;
        disableButton = true;
        filterMessage =
          "Revise and Skip buttons are disabled, since the task is being validated by the super checker";
      } else if (
        userAnnotationData &&
        ["draft"].includes(userAnnotation.annotation_status)
      ) {
        filteredAnnotations = [userAnnotation];
        disableSkip = true;
        disableButton = true;
        filterMessage =
          "Revise and Skip buttons are disabled, since the task is being validated by the super checker";
      } else if (userAnnotation.annotation_status === "draft") {
        filteredAnnotations = [userAnnotation];
      } else if (
        [
          "accepted",
          "accepted_with_minor_changes",
          "accepted_with_major_changes",
        ].includes(userAnnotation.annotation_status)
      ) {
        const superCheckedAnnotation = annotations.find(
          (annotation) => annotation.annotation_type === 3
        );
        if (
          superCheckedAnnotation &&
          ["validated", "validated_with_changes"].includes(
            superCheckedAnnotation.annotation_status
          )
        ) {
          filteredAnnotations = [superCheckedAnnotation];
          filterMessage =
            "This is the Super Checker's Annotation in read only mode";

          disablebtn = true;
          disable = true;
          disableSkip = true;
        } else if (
          superCheckedAnnotation &&
          ["draft", "skipped", "unvalidated"].includes(
            superCheckedAnnotation.annotation_status
          )
        ) {
          filteredAnnotations = [userAnnotation];
          filterMessage = "This task is being validated by the super checker";

          disablebtn = true;
          disable = true;
          disableSkip = true;
        } else {
          filteredAnnotations = [userAnnotation];
        }
      } else if (userAnnotation.annotation_status === "skipped") {
        filteredAnnotations = annotations.filter(
          (value) => value.annotation_type === 1
        );
      } else if (userAnnotation.annotation_status === "to_be_revised") {
        filteredAnnotations = annotations.filter(
          (annotation) =>
            annotation.id === userAnnotation.parent_annotation &&
            annotation.annotation_type === 1
        );
      } else if (userAnnotation.annotation_status === "rejected") {
        filteredAnnotations = annotations.filter(
          (annotation) => annotation.annotation_type === 2
        );
      }
    } else if ([4, 5, 6].includes(user.role)) {
      filteredAnnotations = annotations.filter((a) => a.annotation_type === 2);
      disable = true;
      disablebtn = true;
      disableSkip = true;
    }
    setdisableSkip(disableSkip);
    setDisableBtns(disablebtn);
    setDisableButton(disableButton);
    setFilterMessage(filterMessage);
    setAnnotations(filteredAnnotations);
    return [
      filteredAnnotations,
      disable,
      disableSkip,
      disablebtn,
      disableButton,
      filterMessage,
    ];
  };

  useEffect(() => {
    filterAnnotations(AnnotationsTaskDetails, user, taskDetailList);
  }, [AnnotationsTaskDetails, user, taskDetailList]);

  useEffect(() => {
    const hasEmptyText = result?.some((element) => element.text?.trim() === "") || (stdTranscriptionSettings.showAcoustic && result?.some((element) => element.acoustic_normalised_text?.trim() === ""))
    const hasEmptySpeaker = result?.some(
      (element) => element.speaker_id?.trim() === ""
    );
    settextBox(hasEmptyText);
    setSpeakerBox(hasEmptySpeaker);
  }, [result]);

  const handleCollapseClick = () => {
    !showNotes && setShowStdTranscript(false);
    setShowNotes(!showNotes);
  };


  useEffect(() => {
    const hasEmptyText = result?.some((element) => element.text.trim() === "");
    settextBox(hasEmptyText);
  }, [result]);

  const getTaskData = async (id) => {
    setLoading(true);
    const ProjectObj = new GetTaskDetailsAPI(id);
    dispatch(APITransport(ProjectObj));
    const res = await fetch(ProjectObj.apiEndPoint(), {
      method: "GET",
      body: JSON.stringify(ProjectObj.getBody()),
      headers: ProjectObj.getHeaders().headers,
    });
    const resp = await res.json();
    if (
      !res.ok ||
      resp?.data?.audio_url === "" ||
      resp?.data?.audio_url === null
    ) {
      setLoading(true);
      setSnackbarInfo({
        open: true,
        message: "Audio Server is down, please try after sometime",
        variant: "error",
      });
    }else(setTaskDetailList(resp))
    setLoading(false);
  };

  const handleAutosave = async (id) => {
    const reqBody = {
      task_id: taskId,
      annotation_status: AnnotationsTaskDetails[1]?.annotation_status,
      parent_annotation:AnnotationsTaskDetails[1]?.parent_annotation,
      auto_save: true,
      // cl_format: true,
      // offset: currentPage,
      // limit: limit,
      result: (stdTranscriptionSettings.enable ? [...result, { standardised_transcription: stdTranscription }] : result),
    };
    if(result.length > 0 && taskDetails?.annotation_users?.some((users) => users === user.id)){

    const obj = new SaveTranscriptAPI(AnnotationsTaskDetails[1]?.id, reqBody);
    // dispatch(APITransport(obj));
    const res = await fetch(obj.apiEndPoint(), {
      method: "PATCH",
      body: JSON.stringify(obj.getBody()),
      headers: obj.getHeaders().headers,
    });
    const resp = await res.json();
    if (!res.ok) {
      setSnackbarInfo({
        open: true,
        message: "Error in autosaving annotation",
        variant: "error",
      });
      return res;
    }}
  };

  useEffect(() => {
    
    const handleUpdateTimeSpent = (time = 60) => {
      // const apiObj = new UpdateTimeSpentPerTask(taskId, time);
      // dispatch(APITransport(apiObj));
    };

    saveIntervalRef.current = setInterval(handleAutosave, 60 * 1000);
    timeSpentIntervalRef.current = setInterval(
      handleUpdateTimeSpent,
      60 * 1000
    );

    const handleBeforeUnload = (event) => {
      handleAutosave();
      handleUpdateTimeSpent(ref.current);
      event.preventDefault();
      event.returnValue = "";
      ref.current = 0;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Add event listener for visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab is active, restart the autosave interval
        saveIntervalRef.current = setInterval(handleAutosave, 60 * 1000);
        timeSpentIntervalRef.current = setInterval(
          handleUpdateTimeSpent,
          60 * 1000
        );
      } else {
        handleAutosave();
        handleUpdateTimeSpent(ref.current);
        // Tab is inactive, clear the autosave interval
        clearInterval(saveIntervalRef.current);
        clearInterval(timeSpentIntervalRef.current);
        ref.current = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(saveIntervalRef.current);
      clearInterval(timeSpentIntervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    // eslint-disable-next-line
  }, [result, taskId, AnnotationsTaskDetails, stdTranscription, stdTranscriptionSettings]);

  // useEffect(() => {
  //   const apiObj = new FetchTaskDetailsAPI(taskId);
  //   dispatch(APITransport(apiObj));

  //   return () => {
  //     dispatch({ type: C.CLEAR_STATE, payload: [] });
  //   };
  //   // eslint-disable-next-line
  // }, []);

  // useEffect(() => {
  //   if (AnnotationsTaskDetails && AnnotationsTaskDetails?.id) {
  //     const apiObj = new GetAnnotationsTaskAPI(
  //       // encodeURIComponent(AnnotationsTaskDetails.video_url.replace(/&amp;/g, "&")),
  //       // AnnotationsTaskDetails.src_language,
  //       // AnnotationsTaskDetails.project,
  //       // AnnotationsTaskDetails.is_audio_only
  //     );
  //     dispatch(APITransport(apiObj));

  //     (async () => {
  //       const payloadObj = new GetAnnotationsTaskAPI(
  //         AnnotationsTaskDetails.id,
  //         AnnotationsTaskDetails.task_type
  //       );
  //       dispatch(APITransport(payloadObj));
  //     })();
  //   }
  //   // eslint-disable-next-line
  // }, [AnnotationsTaskDetails]);

  useEffect(() => {

    let standardisedTranscription = "";
    if (
      AnnotationsTaskDetails.some((obj) =>
        obj.result.every((item) => Object.keys(item).length === 0)
      )
    ) {
      const filteredArray = AnnotationsTaskDetails.filter((obj) =>
        obj?.result.some((item) => Object.keys(item).length > 0)
      );
      const sub = filteredArray[0]?.result?.filter((item) => {
        if ("standardised_transcription" in item) {
          standardisedTranscription = item.standardised_transcription;
          return false;
        } else return true;
      }).map((item) => new Sub(item));
      dispatch(setSubtitles(sub, C.SUBTITLES));
    } else {
      const sub = annotations[0]?.result?.filter((item) => {
        if ("standardised_transcription" in item) {
          standardisedTranscription = item.standardised_transcription;
          return false;
        } else return true;
      }).map((item) => new Sub(item));
      dispatch(setSubtitles(sub, C.SUBTITLES));
    }

    setStdTranscription(standardisedTranscription);

    // const newSub = cloneDeep(sub);

    // dispatch(setCurrentPage(transcriptPayload?.current));
    // dispatch(setNextPage(transcriptPayload?.next));      // dispatch(setPreviousPage(transcriptPayload?.previous));
    // dispatch(setTotalPages(transcriptPayload?.count));
    // dispatch(setSubtitlesForCheck(newSub));
    // dispatch(setCompletedCount(transcriptPayload?.completed_count));
    // dispatch(setRangeStart(transcriptPayload?.start));
    // dispatch(setRangeEnd(transcriptPayload?.end));

    // eslint-disable-next-line
  }, [annotations]);

  useMemo(() => {
    const currentIndex = result?.findIndex(
      (item) => item.startTime <= currentTime && item.endTime > currentTime
    );
    setCurrentIndex(currentIndex);
  }, [currentTime, result]);

  useMemo(() => {
    result && setCurrentSubs(result[currentIndex]);
  }, [result, currentIndex]);

  const getAnnotationsTaskData = (id) => {
    setLoading(true);
    const userObj = new GetAnnotationsTaskAPI(id);
    dispatch(APITransport(userObj));
  };

  useEffect(() => {
    getAnnotationsTaskData(taskId);
    getProjectDetails();
    getTaskData(taskId);
    console.log(
      localStorage.getItem("Stage") === "review",
      "StageStageStageStage"
    );
  }, []);
  const getProjectDetails = () => {
    const projectObj = new GetProjectDetailsAPI(projectId);
    dispatch(APITransport(projectObj));
  };

  useEffect(() => {
    if (AnnotationsTaskDetails?.length > 0) {
      setLoading(false);
    }
  }, [AnnotationsTaskDetails]);

  useEffect(() => {
    if(Object.keys(user).includes("prefer_cl_ui") && !(user.prefer_cl_ui) && ProjectDetails?.metadata_json?.acoustic_enabled_stage > 2) {
      const changeUI = async() => {
        handleAutosave().then(navigate(`/projects/${projectId}/review/${taskId}`))
      };
      changeUI();
    }
  }, [user]);

  const tasksComplete = (id) => {
    if (id) {
      // resetNotes();
      // navigate(`/projects/${projectId}/task/${id}`, {replace: true});
      navigate(
        `/projects/${projectId}/ReviewAudioTranscriptionLandingPage/${id}`
      );
    } else {
      // navigate(-1);
      // resetNotes();
      setSnackbarInfo({
        open: true,
        message: "No more tasks to label",
        variant: "info",
      });
      setTimeout(() => {
        localStorage.removeItem("labelAll");
        window.location.replace(`/#/projects/${projectId}`);
        window.location.reload();
      }, 1000);
    }
  };

  const onNextAnnotation = async (value) => {
    setLoading(true);
    const nextAPIData = {
      id: projectId,
      current_task_id: taskId,
      mode: "review",
      annotation_status: labellingMode,
    };

    let apiObj = new GetNextProjectAPI(projectId, nextAPIData)
    var rsp_data = []
    fetch(apiObj.apiEndPoint(), {
      method: 'post',
      body: JSON.stringify(apiObj.getBody()),
      headers: apiObj.getHeaders().headers
    }).then(async response => {
      rsp_data = await response.json();
      setLoading(false)
      if (response.ok) {
        setNextData(rsp_data);
        tasksComplete(rsp_data?.id || null);
        getAnnotationsTaskData(rsp_data.id);
       
      } 
    }).catch((error) => {
      setSnackbarInfo({
        open: true,
        message: "No more tasks to label",
        variant: "info",
      });
      setTimeout(() => {
        localStorage.removeItem("labelAll");
        window.location.replace(`/#/projects/${projectId}`);
      }, 1000);
    });

  }

  const handleReviewClick = async (
    value,
    id,
    lead_time,
    parentannotation,
  ) => {
    setLoading(true);
    const PatchAPIdata = {
      annotation_status: value,
      review_notes: JSON.stringify(reviewNotesRef.current.getEditor().getContents()),
      lead_time:
        (new Date() - loadtime) / 1000 + Number(lead_time?.lead_time ?? 0),
      result: (stdTranscriptionSettings.enable ? [...result, { standardised_transcription: stdTranscription }] : result),
      ...((value === "to_be_revised" || value === "accepted" ||
        value === "accepted_with_minor_changes" ||
        value === "accepted_with_major_changes") && {
        parent_annotation: parentannotation,
      }),
    };
    if (["draft", "skipped"].includes(value) || (!textBox && !speakerBox)) {
    const TaskObj = new PatchAnnotationAPI(id, PatchAPIdata);
    // dispatch(APITransport(GlossaryObj));
    const res = await fetch(TaskObj.apiEndPoint(), {
      method: "PATCH",
      body: JSON.stringify(TaskObj.getBody()),
      headers: TaskObj.getHeaders().headers,
    });
    const resp = await res.json();
    if (res.ok) {
      if (localStorage.getItem("labelAll") || value === "skipped") {
        onNextAnnotation(resp.task);
      }

     
        setSnackbarInfo({
          open: true,
          message: resp?.message,
          variant: "success",
        });
      
    } else {
      setSnackbarInfo({
        open: true,
        message: resp?.message,
        variant: "error",
      });
    }
  }else {
    if (textBox) {
      setSnackbarInfo({
        open: true,
        message: "Please Enter All The Transcripts",
        variant: "error",
      });
    } else {
      setSnackbarInfo({
        open: true,
        message: "Please Select The Speaker",
        variant: "error",
      });
    }
  }
    setLoading(false);
    setShowNotes(false)
    setAnchorEl(null)
  };

  const setNotes = (taskData, annotations) => {
    if (annotations && annotations.length > 0) {
      let userAnnotation = annotations.find(
        (annotation) =>
          annotation.completed_by === user.id &&
          annotation.annotation_type === 2
      );
      if (userAnnotation) {
        let normalAnnotation = annotations.find(
          (annotation) => annotation.id === userAnnotation.parent_annotation
        );
        let superCheckerAnnotation = annotations.find(
          (annotation) => annotation.parent_annotation === userAnnotation.id
        );
        annotationNotesRef.current.value = normalAnnotation?.annotation_notes ?? "";
        reviewNotesRef.current.value = userAnnotation?.review_notes ?? "";
        superCheckerNotesRef.current.value = superCheckerAnnotation?.supercheck_notes ?? "";
        try {
          const newDelta2 = annotationNotesRef.current.value !== "" ? JSON.parse(annotationNotesRef.current.value) : "";
          annotationNotesRef.current.getEditor().setContents(newDelta2);
        } catch (err) {
          if(err){
            const newDelta2 = annotationNotesRef.current.value;
            annotationNotesRef.current.getEditor().setText(newDelta2);  
          }
        }
        
        try {
          const newDelta1 = reviewNotesRef.current.value!=""?JSON.parse(reviewNotesRef.current.value):"";
          reviewNotesRef.current.getEditor().setContents(newDelta1);
        } catch (err) {
          if(err){
            const newDelta1 = reviewNotesRef.current.value;
            reviewNotesRef.current.getEditor().setText(newDelta1); 
          }
        }
        try {
          const newDelta3 = superCheckerNotesRef.current.value!=""?JSON.parse(superCheckerNotesRef.current.value):"";
          superCheckerNotesRef.current.getEditor().setContents(newDelta3);
        } catch (err) {
          if(err){
            const newDelta3 = superCheckerNotesRef.current.value;
            superCheckerNotesRef.current.getEditor().setText(newDelta3); 
          }
        }
        setannotationtext(annotationNotesRef.current.getEditor().getText())
        setreviewtext(reviewNotesRef.current.getEditor().getText())
        setsupercheckertext(superCheckerNotesRef.current.getEditor().getText())

      } else {
        let reviewerAnnotations = annotations.filter(
          (annotation) => annotation.annotation_type === 2
        );
        if (reviewerAnnotations.length > 0) {
          let correctAnnotation = reviewerAnnotations.find(
            (annotation) => annotation.id === taskData.correct_annotation
          );
          if (correctAnnotation) {
            reviewNotesRef.current.value = correctAnnotation.review_notes ?? "";
            annotationNotesRef.current.value =
              annotations.find(
                (annotation) =>
                  annotation.id === correctAnnotation.parent_annotation
              )?.annotation_notes ?? "";
            superCheckerNotesRef.current.value =
              annotations.find(
                (annotation) =>
                  annotation.parent_annotation === correctAnnotation.id
              )?.supercheck_notes ?? "";
              try {
                const newDelta2 = annotationNotesRef.current.value !== "" ? JSON.parse(annotationNotesRef.current.value) : "";
                annotationNotesRef.current.getEditor().setContents(newDelta2);
              } catch (err) {
                if(err){
                  const newDelta2 = annotationNotesRef.current.value;
                  annotationNotesRef.current.getEditor().setText(newDelta2);  
                }
              }
              
              try {
                const newDelta1 = reviewNotesRef.current.value!=""?JSON.parse(reviewNotesRef.current.value):"";
                reviewNotesRef.current.getEditor().setContents(newDelta1);
              } catch (err) {
                if(err){
                  const newDelta1 = reviewNotesRef.current.value;
                  reviewNotesRef.current.getEditor().setText(newDelta1); 
                }
              }
              try {
                const newDelta3 = superCheckerNotesRef.current.value!=""?JSON.parse(superCheckerNotesRef.current.value):"";
                superCheckerNotesRef.current.getEditor().setContents(newDelta3);
              } catch (err) {
                if(err){
                  const newDelta3 = superCheckerNotesRef.current.value;
                  superCheckerNotesRef.current.getEditor().setText(newDelta3); 
                }
              }
                   setannotationtext(annotationNotesRef.current.getEditor().getText())
            setreviewtext(reviewNotesRef.current.getEditor().getText())
            setsupercheckertext(superCheckerNotesRef.current.getEditor().getText())
    
          } else {
            reviewNotesRef.current.value =
              reviewerAnnotations[0].review_notes ?? "";
            annotationNotesRef.current.value =
              annotations.find(
                (annotation) =>
                  annotation.id === reviewerAnnotations[0]?.parent_annotation
              )?.annotation_notes ?? "";
            superCheckerNotesRef.current.value =
              annotations.find(
                (annotation) =>
                  annotation.parent_annotation === reviewerAnnotations[0]?.id
              )?.supercheck_notes ?? "";
              try {
                const newDelta2 = annotationNotesRef.current.value !== "" ? JSON.parse(annotationNotesRef.current.value) : "";
                annotationNotesRef.current.getEditor().setContents(newDelta2);
              } catch (err) {
                if(err){
                  const newDelta2 = annotationNotesRef.current.value;
                  annotationNotesRef.current.getEditor().setText(newDelta2);  
                }
              }
              
              try {
                const newDelta1 = reviewNotesRef.current.value!=""?JSON.parse(reviewNotesRef.current.value):"";
                reviewNotesRef.current.getEditor().setContents(newDelta1);
              } catch (err) {
                if(err){
                  const newDelta1 = reviewNotesRef.current.value;
                  reviewNotesRef.current.getEditor().setText(newDelta1); 
                }
              }
              try {
                const newDelta3 = superCheckerNotesRef.current.value!=""?JSON.parse(superCheckerNotesRef.current.value):"";
                superCheckerNotesRef.current.getEditor().setContents(newDelta3);
              } catch (err) {
                if(err){
                  const newDelta3 = superCheckerNotesRef.current.value;
                  superCheckerNotesRef.current.getEditor().setText(newDelta3); 
                }
              }
      
            setannotationtext(annotationNotesRef.current.getEditor().getText())
            setreviewtext(reviewNotesRef.current.getEditor().getText())
            setsupercheckertext(superCheckerNotesRef.current.getEditor().getText())
    
          }
        } else {
          let normalAnnotation = annotations.find(
            (annotation) => annotation.annotation_type === 1
          );
          annotationNotesRef.current.value =
            normalAnnotation.annotation_notes ?? "";
          reviewNotesRef.current.value = normalAnnotation.review_notes ?? "";
          superCheckerNotesRef.current.value =
            normalAnnotation.supercheck_notes ?? "";
            try {
              const newDelta2 = annotationNotesRef.current.value !== "" ? JSON.parse(annotationNotesRef.current.value) : "";
              annotationNotesRef.current.getEditor().setContents(newDelta2);
            } catch (err) {
              if(err){
                const newDelta2 = annotationNotesRef.current.value;
                annotationNotesRef.current.getEditor().setText(newDelta2);  
              }
            }
            
            try {
              const newDelta1 = reviewNotesRef.current.value!=""?JSON.parse(reviewNotesRef.current.value):"";
              reviewNotesRef.current.getEditor().setContents(newDelta1);
            } catch (err) {
              if(err){
                const newDelta1 = reviewNotesRef.current.value;
                reviewNotesRef.current.getEditor().setText(newDelta1); 
              }
            }
            try {
              const newDelta3 = superCheckerNotesRef.current.value!=""?JSON.parse(superCheckerNotesRef.current.value):"";
              superCheckerNotesRef.current.getEditor().setContents(newDelta3);
            } catch (err) {
              if(err){
                const newDelta3 = superCheckerNotesRef.current.value;
                superCheckerNotesRef.current.getEditor().setText(newDelta3); 
              }
            }
              setannotationtext(annotationNotesRef.current.getEditor().getText())
          setreviewtext(reviewNotesRef.current.getEditor().getText())
          setsupercheckertext(superCheckerNotesRef.current.getEditor().getText())
  
        }
      }
    }
  };

  useEffect(()=>{
    setNotes(taskDetailList, AnnotationsTaskDetails);

  },[taskDetailList,AnnotationsTaskDetails]);

  const resetNotes = () => {
    setShowNotes(false);
    reviewNotesRef.current.getEditor().setContents([]);
  };

  useEffect(() => {
    resetNotes();
  }, [taskId]);
  const modules = {
    toolbar: [

      [{ size: [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
    ]
  };

  const formats = [
    'size',
    'bold', 'italic', 'underline', 'strike',
    'color',
    'script']

  const renderSnackBar = () => {
    return (
      <CustomizedSnackbars
        open={snackbar.open}
        handleClose={() =>
          setSnackbarInfo({ open: false, message: "", variant: "" })
        }
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    );
  };

  const [wave, setWave] = useState(true);
  const [waveColor, setWaveColor] = useState("#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState("#1C2022");
  const [paddingColor, setPaddingColor] = useState("#FFFFFF");
  const [cursor, setCursor] = useState(true);
  const [cursorColor, setCursorColor] = useState("#FF0000");
  const [progress, setProgress] = useState(true);
  const [progressColor, setProgressColor] = useState("#FFFFFF");
  const [grid, setGrid] = useState(true);
  const [gridColor, setGridColor] = useState("#FFFFFF");
  const [ruler, setRuler] = useState(true);
  const [rulerColor, setRulerColor] = useState("#FFFFFF");
  const [scrollbar, setScrollbar] = useState(true);
  const [scrollbarColor, setScrollbarColor] = useState("#FFFFFF");
  const [rulerAtTop, setRulerAtTop] = useState(true);
  const [scrollable, setScrollable] = useState(true);
  const [duration, setDuration] = useState(10);
  const [padding, setPadding] = useState(1);
  const [pixelRatio, setPixelRatio] = useState(1);
  const [waveScale, setWaveScale] = useState(1);
  const [waveSize, setWaveSize] = useState(1);
  const [waveformSettings, setWaveformSettings] = useState({"wave":wave, "waveColor":waveColor, "backgroundColor":backgroundColor, "paddingColor":paddingColor,
"cursor":cursor, "cursorColor":cursorColor, "progress":progress, "progressColor":progressColor, "grid":grid, "gridColor":gridColor, "ruler":ruler,
"rulerColor":rulerColor, "scrollbar":scrollbar, "scrollbarColor":scrollbarColor, "rulerAtTop": rulerAtTop, "scrollable":scrollable, "duration":duration, "padding":padding,
"pixelRatio":pixelRatio, "waveScale":waveScale, "waveSize":waveSize});

useEffect(() => {
  setWaveformSettings({"wave":wave, "waveColor":waveColor, "backgroundColor":backgroundColor, "paddingColor":paddingColor,
  "cursor":cursor, "cursorColor":cursorColor, "progress":progress, "progressColor":progressColor, "grid":grid, "gridColor":gridColor, "ruler":ruler,
  "rulerColor":rulerColor, "scrollbar":scrollbar, "scrollbarColor":scrollbarColor, "rulerAtTop": rulerAtTop, "scrollable":scrollable, "duration":duration, "padding":padding,
  "pixelRatio":pixelRatio, "waveScale":waveScale, "waveSize":waveSize})
}, [wave, waveColor, backgroundColor, paddingColor, cursor, cursorColor, progress, progressColor, grid, gridColor, ruler, rulerColor, scrollbar, scrollbarColor, rulerAtTop, scrollable, duration, padding, pixelRatio, waveScale, waveSize]);
  
useEffect(() => {
  if(showNotes === true){
    setAdvancedWaveformSettings(false);
  }
}, [showNotes]);


useEffect(() => {
  if(advancedWaveformSettings === true){
    setShowNotes(false);
  }
}, [advancedWaveformSettings]);


  return (
    <>
      {loading && <Spinner />}
      {renderSnackBar()}
      <Grid container direction={"row"} className={classes.parentGrid}>
        <Grid md={6} xs={12} id="video" className={classes.videoParent}>
          <Button
            value="Back to Project"
            startIcon={<ArrowBackIcon />}
            variant="contained"
            color="primary"
            sx={{ ml: 1 }}
            onClick={() => {
              localStorage.removeItem("labelAll");
              navigate(`/projects/${projectId}`);
              //window.location.replace(`/#/projects/${projectId}`);
              //window.location.reload();
            }}
          >
            Back to Project
          </Button>

          <Box
            // style={{ height: videoDetails?.video?.audio_only ? "100%" : "" }}
            className={classes.videoBox}
          >
            <ReviewStageButtons
              handleReviewClick={handleReviewClick}
              onNextAnnotation={onNextAnnotation}
              AnnotationsTaskDetails={AnnotationsTaskDetails}
              filterMessage={filterMessage}
              disableSkip={disableSkip}
              disableBtns={disableBtns}
              disableButton={disableButton}
              anchorEl={anchorEl} setAnchorEl={setAnchorEl}
            />
            <AudioPanel
              setCurrentTime={setCurrentTime}
              setPlaying={setPlaying}
              onNextAnnotation={onNextAnnotation}
              AnnotationsTaskDetails={AnnotationsTaskDetails}
              taskData={taskDetailList}
            />
            <Grid container spacing={1} sx={{ mt: 2, ml: 3 }}>
              <Grid item>
              <Button
                endIcon={showNotes ? <ArrowRightIcon /> : <ArrowDropDownIcon />}
                variant="contained"
                color={
                  annotationtext.trim().length === 0 &&
                  supercheckertext.trim().length === 0
                    ? "primary"
                    : "success"
                }
                onClick={handleCollapseClick}
              >
                Notes{" "}
                {annotationtext.trim().length === 0 &&
                supercheckertext.trim().length === 0 ? "" : "*"}

              </Button>
              
                {/*  <Alert severity="warning" showIcon style={{marginBottom: '1%'}}>
              {translate("alert.notes")}
          </Alert> 
                <TextField
              multiline
              placeholder="Place your remarks here ..."
              label="Annotation Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={annotationNotesRef}
              rows={1}
              maxRows={3}
              inputProps={{
                style: { fontSize: "1rem" },
                readOnly: true,
              }}
              style={{ width: "99%", marginTop: "1%" }}
            // ref={quillRef}
            />
          
          <TextField
              multiline
              placeholder="Place your remarks here ..."
              label="Review Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={reviewNotesRef}
              rows={1}
              maxRows={3}
              inputProps={{
                style: { fontSize: "1rem" },
               
              }}
              style={{ width: "99%", marginTop: "1%" }}
              // ref={quillRef}
            />
            <TextField
              multiline
              placeholder="Place your remarks here ..."
              label="Super Checker Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={superCheckerNotesRef}
              rows={1}
              maxRows={3}
              inputProps={{
                style: { fontSize: "1rem" },
                readOnly: true,
              }}
              style={{ width: "99%", marginTop: "1%" }}
            // ref={quillRef}
            /> */}
                
              </Grid>
              {stdTranscriptionSettings.enable &&
                <Grid item>
                  <Button
                    endIcon={showStdTranscript ? <ArrowRightIcon /> : <ArrowDropDownIcon />}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setShowStdTranscript(!showStdTranscript);
                      setShowNotes(false);
                    }}
                  // style={{ marginBottom: "20px" }}
                  >
                    Standardised Transcription
                  </Button>
                </Grid>}
            </Grid>
            <div
                className={classes.collapse}
                style={{
                  display: showNotes ? "block" : "none",
                  paddingBottom: "16px",
                  height: "max-content", overflow: "auto"
                }}
              >
                <ReactQuill
                  ref={annotationNotesRef}
                  modules={modules}
                  bounds={"#note"}
                  theme="bubble"
                  formats={formats}
                  placeholder="Annotation Notes"
                  readOnly={true}
                ></ReactQuill>
                <ReactQuill
                  ref={reviewNotesRef}
                  modules={modules}
                  bounds={"#note"}
                  theme="bubble"
                  formats={formats}
                  placeholder="Review Notes"
                ></ReactQuill>
                <ReactQuill
                  ref={superCheckerNotesRef}
                  modules={modules}
                  bounds={"#note"}
                  theme="bubble"
                  formats={formats}
                  placeholder="SuperChecker Notes"
                  readOnly={true}
                ></ReactQuill>
            </div>
            <div
              className={classes.collapse}
              style={{
                display: showStdTranscript ? "block" : "none",
                paddingBottom: "16px",
                overflow: "auto",
                height: "max-content"
              }}
            >
              {stdTranscriptionSettings.enableTransliteration ? (
                <IndicTransliterate
                  lang={stdTranscriptionSettings.targetlang}
                  value={stdTranscription}
                  onChange={(e) => {
                    setStdTranscription(e.target.value);
                  }}
                  onChangeText={() => { }}
                  enabled={stdTranscriptionSettings.enableTransliterationSuggestion}
                  containerStyles={{
                    width: "100%",
                  }}
                  renderComponent={(props) => (
                    <div className={classes.relative} style={{ width: "100%" }}>
                      <textarea
                        className={classes.customTextarea}
                        dir={stdTranscriptionSettings.rtl ? "rtl" : "ltr"}
                        rows={4}
                        style={{ fontSize: stdTranscriptionSettings.fontSize, height: "120px" }}
                        {...props}
                      />
                    </div>
                  )}
                />
              ) : (
                <div className={classes.relative} style={{ width: "100%" }}>
                  <textarea
                    onChange={(e) => {
                      setStdTranscription(e.target.value);
                    }}
                    value={stdTranscription}
                    dir={stdTranscriptionSettings.rtl ? "rtl" : "ltr"}
                    className={classes.customTextarea}
                    style={{
                      fontSize: stdTranscriptionSettings.fontSize,
                      height: "120px",
                    }}
                    rows={4}
                  />
                </div>
              )}
            </div>
            <div
              className={classes.collapse}
              style={{
                display: advancedWaveformSettings ? "block" : "none",
                marginTop: "15%",
                overflow: "auto",
                height: "max-content"
              }}
              >
                <table style={{width: "100%", textAlign: 'center', fontSize: 'large'}}>
                  <tr>
                    <td>Wave:&nbsp;&nbsp;<input type='checkbox' checked={wave} onChange={() => {setWave(!wave)}}></input> <input type='color' value={waveColor} onChange={(e) => {setWaveColor(e.target.value)}}></input></td>
                    <td>Background:&nbsp;&nbsp;<input type='color' value={backgroundColor} onChange={(e) => {setBackgroundColor(e.target.value)}}></input></td>
                    <td colSpan={2}>Padding:&nbsp;&nbsp;<input type='color' value={paddingColor} onChange={(e) => {setPaddingColor(e.target.value)}}></input></td>
                    <td>Cursor:&nbsp;&nbsp;<input type='checkbox' checked={cursor} onChange={() => {setCursor(!cursor)}}></input> <input type='color' value={cursorColor} onChange={(e) => {setCursorColor(e.target.value)}}></input></td>
                    <td>Progress:&nbsp;&nbsp;<input type='checkbox' checked={progress} onChange={() => {setProgress(!progress)}}></input> <input type='color' value={progressColor} onChange={(e) => {setProgressColor(e.target.value)}}></input></td>
                  </tr>
                  <tr>
                    <td>Grid:&nbsp;&nbsp;<input type='checkbox' checked={grid} onChange={() => {setGrid(!grid)}}></input> <input type='color' value={gridColor} onChange={(e) => {setGridColor(e.target.value)}}></input></td>
                    <td>Ruler:&nbsp;&nbsp;<input type='checkbox' checked={ruler} onChange={() => {setRuler(!ruler)}}></input> <input type='color' value={rulerColor} onChange={(e) => {setRulerColor(e.target.value)}}></input></td>
                    <td colSpan={2}>Scrollbar:&nbsp;&nbsp;<input type='checkbox' checked={scrollbar} onChange={() => {setScrollbar(!scrollbar)}}></input> <input type='color' value={scrollbarColor} onChange={(e) => {setScrollbarColor(e.target.value)}}></input></td>
                    <td>Ruler At Top:&nbsp;&nbsp;<input type='checkbox' checked={rulerAtTop} onChange={() => {setRulerAtTop(!rulerAtTop)}}></input></td>
                    <td>Scrollable:&nbsp;&nbsp;<input type='checkbox' checked={scrollable} onChange={() => {setScrollable(!scrollable)}}></input></td>
                  </tr>
                  <tr>
                    <td colSpan={2}>Duration:&nbsp;&nbsp;<input type='range' min={2} max={100} step={2} value={duration} onChange={(e) => {setDuration(e.target.value)}}></input>&nbsp;{duration}</td>
                    <td colSpan={2}>Padding:&nbsp;&nbsp;<input type='range' min={0} max={20} step={1} value={padding} onChange={(e) => {setPadding(e.target.value)}}></input>&nbsp;{padding}</td>
                    <td colSpan={2}>Pixel Ratio:&nbsp;&nbsp;<input type='range' min={1} max={2} step={1} value={pixelRatio} onChange={(e) => {setPixelRatio(e.target.value)}}></input>&nbsp;{pixelRatio}</td>
                  </tr>
                  <tr>
                    <td colSpan={3}>Wave Scale:&nbsp;&nbsp;<input type='range' min={0.1} max={2} step={0.1} value={waveScale} onChange={(e) => {setWaveScale(e.target.value)}}></input>&nbsp;{waveScale}</td>
                    <td colSpan={3}>Wave Size:&nbsp;&nbsp;<input type='range' min={1} max={10} step={1} value={waveSize} onChange={(e) => {setWaveSize(e.target.value)}}></input>&nbsp;{waveSize}</td>
                  </tr>
                </table>
            </div>
          </Box>
        </Grid>

        <Grid md={6} xs={12} sx={{ width: "100%" }}>
          <TranscriptionRightPanel
            currentIndex={currentIndex}
            AnnotationsTaskDetails={AnnotationsTaskDetails}
            player={player}
            ProjectDetails={ProjectDetails}
            TaskDetails={taskDetailList}
            stage={2}
            handleStdTranscriptionSettings={setStdTranscriptionSettings}
            advancedWaveformSettings={advancedWaveformSettings}
            setAdvancedWaveformSettings={setAdvancedWaveformSettings}
          />
        </Grid>
      </Grid>

      <Grid
        width={"100%"}
        position="fixed"
        bottom={1}
      // style={fullscreen ? { visibility: "hidden" } : {}}
      >
        <Timeline currentTime={currentTime} playing={playing}  taskID={taskDetailList} waveformSettings={waveformSettings}/>
      </Grid>
    </>
  );
};
export default ReviewAudioTranscriptionLandingPage;
