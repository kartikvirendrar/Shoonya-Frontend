import PropTypes from "prop-types";
import React, { useState, useEffect, useRef } from "react";
import ReactQuill, { Quill } from 'react-quill';
import "./editor.css"
import 'quill/dist/quill.bubble.css';
import LabelStudio from "@heartexlabs/label-studio";
import {
  Tooltip,
  Button,
  Box,
  Card,
  TextField,
  Grid,
  Alert,
  Popover,
  Autocomplete,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import CustomizedSnackbars from "../../component/common/Snackbar";
import generateLabelConfig from "../../../../utils/LabelConfig/ConversationTranslation";
import { styled, alpha } from "@mui/material/styles";
import Menu, { MenuProps } from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Glossary from "../Glossary/Glossary";
import { TabsSuggestionData } from "../../../../utils/TabsSuggestionData/TabsSuggestionData";
import InfoIcon from "@mui/icons-material/Info";
import getCaretCoordinates from "textarea-caret";
import conversationVerificationLabelConfig from "../../../../utils/LabelConfig/ConversationVerification";
import GetProjectDetailsAPI from "../../../../redux/actions/api/ProjectDetails/GetProjectDetails";
import APITransport from "../../../../redux/actions/apitransport/apitransport";


import {
  getProjectsandTasks,
  getNextProject,
  fetchAnnotation,
  postReview,
  patchReview,
} from "../../../../redux/actions/api/LSFAPI/LSFAPI";

import { useParams, useNavigate } from "react-router-dom";
import useFullPageLoader from "../../../../hooks/useFullPageLoader";

import styles from "./lsf.module.css";
import "./lsf.css";
import { useSelector, useDispatch } from "react-redux";
import { translate } from "../../../../config/localisation";


const StyledMenu = styled((props) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "right",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "right",
    }}
    {...props}
  />
))(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color:
      theme.palette.mode === "light"
        ? "rgb(55, 65, 81)"
        : theme.palette.grey[300],
    boxShadow:
      "rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
    "& .MuiMenu-list": {
      padding: "4px 0",
    },
    "& .MuiMenuItem-root": {
      "& .MuiSvgIcon-root": {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      "&:active": {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity
        ),
      },
    },
  },
}));

const filterAnnotations = (
  annotations,
  user,
  setDisableBtns,
  setFilterMessage,
  setDisableButton,
  taskData,
) => {
  let filteredAnnotations = annotations;
  let userAnnotation = annotations.find((annotation) => {
    return annotation.completed_by === user.id && annotation.parent_annotation;
  });
  let disable = false;
  let disableSkip = false;
  let userAnnotationData = annotations.find(
    (annotation) =>
      annotation.annotation_type === 3
  );
  if (userAnnotation) {
    if (userAnnotation.annotation_status === "unreviewed") {
      filteredAnnotations = userAnnotation.result.length > 0 && !taskData?.revision_loop_count?.review_count
        ? [userAnnotation]
        : annotations.filter((annotation) => annotation.id === userAnnotation.parent_annotation && annotation.annotation_type === 1);
    } else if (
      userAnnotation &&
      [
        "rejected"
      ].includes(userAnnotation.annotation_status)
    ) {
      filteredAnnotations = [userAnnotation];
      disableSkip = true;
      setDisableButton(true);
      setFilterMessage("Revise and Skip buttons are disabled, since the task is being validated by the super checker");
    }
    else if (
      userAnnotationData &&
      [
        "draft"
      ].includes(userAnnotation.annotation_status)
    ) {
      filteredAnnotations = [userAnnotation];
      disableSkip = true;
      setDisableButton(true);
      setFilterMessage("Revise and Skip buttons are disabled, since the task is being validated by the super checker");
    }
    else if (userAnnotation.annotation_status === "draft") {
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
        setFilterMessage(
          "This is the Super Checker's Annotation in read only mode"
        );
        setDisableBtns(true);
        disable = true;
      } else if (
        superCheckedAnnotation &&
        ["draft", "skipped", "unvalidated"].includes(
          superCheckedAnnotation.annotation_status
        )
      ) {
        filteredAnnotations = [userAnnotation];
        setFilterMessage(
          "This task is being validated by the super checker"
        );
        setDisableBtns(true);
        disable = true;
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
    setDisableBtns(true);
    disableSkip = true;
  }
  return [filteredAnnotations, disable, disableSkip];
};

//used just in postAnnotation to support draft status update.

const AUTO_SAVE_INTERVAL = 60000;
const AUDIO_PROJECT_SAVE_CHECK = [
  "AudioTranscription",
  "AudioTranscriptionEditing",
  "AcousticNormalisedTranscriptionEditing",
];

const LabelStudioWrapper = ({
  reviewNotesRef,
  annotationNotesRef,
  superCheckerNotesRef,
  loader,
  showLoader,
  hideLoader,
  resetNotes,
  setannotationtext,
  setreviewtext,
  setsupercheckertext,
  getTaskData,
}) => {
  // we need a reference to a DOM node here so LSF knows where to render
  const review_status = useRef();
  const rootRef = useRef();
  // this reference will be populated when LSF initialized and can be used somewhere else
  const lsfRef = useRef();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [labelConfig, setLabelConfig] = useState();
  const [snackbar, setSnackbarInfo] = useState({
    open: false,
    message: "",
    variant: "success",
  });
  const [taskData, setTaskData] = useState(undefined);
  const [annotations, setAnnotations] = useState([]);
  const load_time = useRef();
  const [autoSave, setAutoSave] = useState(true);
  const { projectId, taskId } = useParams();
  const userData = useSelector((state) => state.fetchLoggedInUserData.data);
  const ProjectDetails = useSelector((state) => state.getProjectDetails.data);
  let loaded = useRef();
  const [showTagSuggestionsAnchorEl, setShowTagSuggestionsAnchorEl] =
    useState(null);
  const [tagSuggestionList, setTagSuggestionList] = useState();
  const [disableBtns, setDisableBtns] = useState(false);
  const [filterMessage, setFilterMessage] = useState(null);
  const [disableButton, setDisableButton] = useState(false);
 


  //console.log("projectId, taskId", projectId, taskId);
  // debugger

  useEffect(() => {
    if(Object.keys(userData).includes("prefer_cl_ui") && (userData.prefer_cl_ui) && ProjectDetails?.project_type?.includes("Acoustic")) {
      autoSaveReview();
      navigate(`/projects/${projectId}/ReviewAudioTranscriptionLandingPage/${taskId}`);
    }
  }, [userData]);
  
  useEffect(() => {
    localStorage.setItem(
      "labelStudio:settings",
      JSON.stringify({
        bottomSidePanel:
          !(ProjectDetails?.project_type?.includes("Audio")
          || ProjectDetails?.project_type?.includes("Acoustic")),
        continuousLabeling: false,
        enableAutoSave: false,
        enableHotkeys: true,
        enableLabelTooltips: true,
        enablePanelHotkeys: true,
        enableTooltips: false,
        fullscreen: false,
        imageFullSize: false,
        selectAfterCreate: false,
        showAnnotationsPanel: true,
        showLabels: false,
        showLineNumbers: false,
        showPredictionsPanel: true,
        sidePanelMode: "SIDEPANEL_MODE_REGIONS",
      })
    );
  }, []);

  const tasksComplete = (id) => {
    if (id) {
      resetNotes();
      navigate(`/projects/${projectId}/review/${id}`);
    } else {
      // navigate(-1);
      resetNotes();
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

  function LSFRoot(
    rootRef,
    lsfRef,
    userData,
    projectId,
    taskData,
    labelConfig,
    annotations,
    predictions,
    annotationNotesRef,
    reviewNotesRef,
    superCheckerNotesRef,
    projectType
  ) {
    let interfaces = [];
    if (predictions == null) predictions = [];

    const [filteredAnnotations, disableLSFControls, disableSkip] = filterAnnotations(
      annotations,
      userData,
      setDisableBtns,
      setFilterMessage,
      setDisableButton,
      taskData
    );
    if (taskData.task_status === "freezed") {
      interfaces = [
        "panel",
        //"update",
        // "submit",
        "skip",
        ...(disableLSFControls ? [] : ["controls"]),
        "infobar",
        "topbar",
        "instruction",
        ...(projectType === "AudioTranscription" ||
          projectType === "AudioTranscriptionEditing"
          ? ["side-column"]
          : []),
        "annotations:history",
        "annotations:tabs",
        "annotations:menu",
        "annotations:current",
        // "annotations:add-new",
        "annotations:delete",
        "annotations:view-all",
        "predictions:tabs",
        "predictions:menu",
        // "auto-annotation",
        "edit-history",
      ];
    } else {
      interfaces = [
        "panel",
        //"update",
        "submit",
        ...(!disableSkip ? ["skip"] : []),
        // "skip",
        ...(disableLSFControls ? [] : ["controls"]),
        "infobar",
        "topbar",
        "instruction",
        ...(projectType === "AudioTranscription" ||
          projectType === "AudioTranscriptionEditing"
          ? ["side-column"]
          : []),
        "annotations:history",
        "annotations:tabs",
        "annotations:menu",
        "annotations:current",
        // "annotations:add-new",
        // "annotations:delete",
        "annotations:view-all",
        "predictions:tabs",
        "predictions:menu",
        // "auto-annotation",
        "edit-history",
      ];
    }

    if (disableLSFControls) setAutoSave(false);

    if (rootRef.current) {
      if (lsfRef.current) {
        lsfRef.current.destroy();
      }
      lsfRef.current = new LabelStudio(rootRef.current, {
        /* all the options according to the docs */
        config: labelConfig,

        interfaces: interfaces,

        user: {
          pk: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
        },

        task: {
          // annotations: annotations.filter((annotation) => !annotation.parent_annotation).concat(annotations.filter((annotation) => annotation.id === taskData.correct_annotation)),
          annotations: filteredAnnotations,
          predictions: predictions,
          id: taskData.id,
          data: taskData.data,
        },

        onLabelStudioLoad: function (ls) {
          // if (taskData.correct_annotation) {
          //   let annotation = annotations.find(
          //     (annotation) =>
          //       annotation.id === taskData.correct_annotation
          //   );
          //   ls.annotationStore.selectAnnotation(annotation.result[0].id);
          // } else {
          // let hasReview = false;
          // for (let i = 0; i < annotations.length; i++) {
          //   console.log(annotations[i], "test");
          //   if (annotations[i].parent_annotation) {
          //     ls.annotationStore.selectAnnotation(annotations[i].result[0].id);
          //     // hasReview = true;
          //     break;
          //   }
          // }
          // if (!hasReview) {
          //   var c = ls.annotationStore.addAnnotation({
          //     userGenerate: true,
          //   });
          //   ls.annotationStore.selectAnnotation(c.id);
          // }
          // }
          load_time.current = new Date();
        },

        onSkipTask: function (annotation) {
          // message.warning('Notes will not be saved for skipped tasks!');
          let review = annotations.find((value) => value.annotation_type === 2);
          if (review) {
            showLoader();
            patchReview(
              review.id,
              load_time.current,
              review.lead_time,
              "skipped",
              JSON.stringify(reviewNotesRef.current.getEditor().getContents())
              ).then(() => {
              getNextProject(projectId, taskData.id, "review").then((res) => {
                hideLoader();
                tasksComplete(res?.id || null);
              });
            });
          }
        },

        // onUpdateAnnotation: function (ls, annotation) {
        //   console.log(  annotations," annotation.serializeAnnotation()")
        //   if (taskData.task_status !== "freezed") {
        //     for (let i = 0; i < annotations.length; i++) {
        //       if (
        //         annotation.serializeAnnotation()[0]?.id ===
        //         annotations[i].result[0]?.id
        //       ) {
        //         let temp, review;
        //         showLoader();
        //         if (annotations[i].parent_annotation) {
        //           review = annotations[i];
        //         } else {
        //           review = annotations.find((annotation) => annotation.parent_annotation === annotations[i].id);
        //         }
        //         if (review) {
        //           temp = review.result;
        //           temp[0].value = annotation.serializeAnnotation()[0].value;
        //           for (let i = 0; i < temp.length; i++) {
        //             if (temp[i].value.text) {
        //               temp[i].value.text = [temp[i].value.text[0]];
        //             }
        //           }
        //           patchReview(
        //             //projectType === "SingleSpeakerAudioTranscriptionEditing" ? annotation.serializeAnnotation() : temp,
        //             review.id,
        //             review.parent_annotation,
        //             load_time,
        //             review.lead_time,
        //             review_status.current,
        //             // annotationNotesRef.current.value,
        //             reviewNotesRef.current.value
        //           ).then(() => {
        //             if (localStorage.getItem("labelAll"))
        //               getNextProject(projectId, taskData.id, "review").then(
        //                 (res) => {
        //                   hideLoader();
        //                   tasksComplete(res?.id || null);
        //                 }
        //               );
        //             else {
        //               hideLoader();
        //               window.location.reload();
        //             }
        //           });
        //         } else {
        //           var c = ls.annotationStore.addAnnotation({
        //             userGenerate: true,
        //           });
        //           temp = c;
        //           c = annotation.serializeAnnotation();
        //           c[0].id = temp.id;
        //           temp = c;
        //           for (let i = 0; i < temp.length; i++) {
        //             if (temp[i].value.text) {
        //               temp[i].value.text = [temp[i].value.text[0]];
        //             }
        //           }
        //           postReview(
        //            // projectType === "SingleSpeakerAudioTranscriptionEditing" ? annotation.serializeAnnotation() : temp,
        //             taskData.id,
        //             userData.id,
        //             annotations[i].id,
        //             load_time,
        //             annotations[i].lead_time,
        //             review_status.current,
        //             annotationNotesRef.current.value,
        //             reviewNotesRef.current.value
        //           ).then(() => {
        //             if (localStorage.getItem("labelAll"))
        //               getNextProject(projectId, taskData.id, "review").then(
        //                 (res) => {
        //                   hideLoader();
        //                   tasksComplete(res?.id || null);
        //                 }
        //               );
        //             else {
        //               hideLoader();
        //               window.location.reload();
        //             }
        //           });
        //         }
        //       }
        //     }
        //   } else
        //     setSnackbarInfo({
        //       open: true,
        //       message: "Task is frozen",
        //       variant: "error",
        //     });
        // },

        onUpdateAnnotation: function (ls, annotation) {
          if (AUDIO_PROJECT_SAVE_CHECK.includes(projectType)) {
            let temp = annotation.serializeAnnotation();
            const counter = temp.reduce((acc, curr) => {
              if (curr.from_name === "labels")
                acc.labels++;
              else if (["transcribed_json", "verbatim_transcribed_json"].includes(curr.from_name)) {
                if (curr.value.text[0] === "")
                  acc.empty++;
                acc.textareas++;
              }
              return acc;
            },
              { labels: 0, textareas: 0, empty: 0 }
            );
            if (counter.labels !== counter.textareas || counter.empty) {
              setSnackbarInfo({
                open: true,
                message: "Please fill the annotations for every segment/region",
                variant: "warning",
              });
              return;
            }
          }
          if (taskData.annotation_status !== "freezed") {
            setAutoSave(false);
            showLoader();
            let temp = annotation.serializeAnnotation();

            for (let i = 0; i < temp.length; i++) {
              if (temp[i].value.text) {
                temp[i].value.text = [temp[i].value.text[0]];
              }
            }

            let review = annotations.filter(
              (annotation) => annotation.annotation_type === 2
            )[0];
            patchReview(
              review.id,
              load_time.current,
              review.lead_time,
              review_status.current,
              temp,
              review.parent_annotation,
              JSON.stringify(reviewNotesRef.current.getEditor().getContents())
            ).then(() => {
              if (localStorage.getItem("labelAll"))
                getNextProject(projectId, taskData.id, "review").then(
                  (res) => {
                    hideLoader();
                    tasksComplete(res?.id || null);
                  }
                );
              else {
                hideLoader();
                window.location.reload();
              }
            });
          } else
            setSnackbarInfo({
              open: true,
              message: "Task is frozen",
              variant: "error",
            });
        },
      });
    }
  }

  const setNotes = (taskData, annotations) => {
    if (annotations && Array.isArray(annotations) && annotations.length > 0) {
      let userAnnotation = annotations.find(
        (annotation) =>
          annotation.completed_by === userData.id &&
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
        superCheckerNotesRef.current.value = superCheckerAnnotation?.supercheck_notes ?? "";
        reviewNotesRef.current.value =  userAnnotation?.review_notes ?? "";
        console.log(annotationNotesRef,typeof(annotationNotesRef.current.value));
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
                  annotationNotesRef.current.getEditor().setText(newDelta2);                 }
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
                  annotation.id === reviewerAnnotations[0].parent_annotation
              )?.annotation_notes ?? "";
            superCheckerNotesRef.current.value =
              annotations.find(
                (annotation) =>
                  annotation.parent_annotation === reviewerAnnotations[0].id
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
          annotationNotesRef.current.value = normalAnnotation.annotation_notes ?? "";
        superCheckerNotesRef.current.value = normalAnnotation.supercheck_notes ?? "";
        reviewNotesRef.current.value =  normalAnnotation.review_notes ?? "";
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

  // we're running an effect on component mount and rendering LSF inside rootRef node

  useEffect(() => {
    const projectObj = new GetProjectDetailsAPI(projectId);
    dispatch(APITransport(projectObj));
  }, [])

  useEffect(() => {
    if (localStorage.getItem("rtl") === "true") {
      var style = document.createElement("style");
      style.innerHTML = "input, textarea { direction: RTL; }";
      document.head.appendChild(style);
    }
    if (userData?.id && loaded.current !== taskId) {
      loaded.current = taskId;
      getProjectsandTasks(projectId, taskId).then(
        ([labelConfig, taskData, annotations, predictions]) => {
          // both have loaded!
          // console.log("[labelConfig, taskData, annotations, predictions]", [
          //   labelConfig,
          //   taskData,
          //   annotations,
          //   predictions,
          // ]);
          setNotes(taskData, annotations);
          let tempLabelConfig =
            labelConfig.project_type === "ConversationTranslation" ||
              labelConfig.project_type === "ConversationTranslationEditing"
              ? generateLabelConfig(taskData.data)
              : labelConfig.project_type === "ConversationVerification"
                ? conversationVerificationLabelConfig(taskData.data)
                : labelConfig.label_config;
          setLabelConfig(tempLabelConfig);
          setAnnotations(annotations);
          setTaskData(taskData);
          getTaskData(taskData);
          LSFRoot(
            rootRef,
            lsfRef,
            userData,
            projectId,
            taskData,
            tempLabelConfig,
            annotations,
            predictions,
            annotationNotesRef,
            reviewNotesRef,
            superCheckerNotesRef,
            labelConfig.project_type
          );
          hideLoader();
        }
      );
    }

    // Traversing and tab formatting --------------------------- start
    // const outputTextareaHTMLEleArr =
    //   document.getElementsByName("transcribed_json");
    // if (outputTextareaHTMLEleArr.length > 0) {
    //   const targetElement = outputTextareaHTMLEleArr[0];
    //   if (targetElement) {
    //     targetElement.oninput = function (e) {
    //       let textAreaInnerText = e.target.value;

    //       // console.log("e ---------------------- ", e.currentTarget);

    //       let lastInputChar =
    //         textAreaInnerText[targetElement.selectionStart - 1];
    //       if (
    //         lastInputChar === "\\" &&
    //         localStorage.getItem("enableTags") === "true"
    //       ) {
    //         let indexOfLastSpace =
    //           textAreaInnerText.lastIndexOf(
    //             " ",
    //             targetElement.selectionStart - 1
    //           ) <
    //           textAreaInnerText.lastIndexOf(
    //             "\n",
    //             targetElement.selectionStart - 1
    //           )
    //             ? textAreaInnerText.lastIndexOf(
    //                 "\n",
    //                 targetElement.selectionStart - 1
    //               )
    //             : textAreaInnerText.lastIndexOf(
    //                 " ",
    //                 targetElement.selectionStart - 1
    //               );

    //         let currentSelectionRangeStart = indexOfLastSpace + 1;
    //         let currentSelectionRangeEnd = targetElement.selectionStart - 1;

    //         let currentTargetWord = textAreaInnerText.slice(
    //           currentSelectionRangeStart,
    //           currentSelectionRangeEnd
    //         );
    //         let filteredSuggestionByInput = TabsSuggestionData.filter((el) =>
    //           el.toLowerCase().includes(currentTargetWord.toLowerCase())
    //         );
    //         if (
    //           filteredSuggestionByInput &&
    //           filteredSuggestionByInput.length > 0
    //         ) {
    //           const suggestionTagsContainer = (
    //             <Grid
    //               sx={{
    //                 width: "max-content",
    //                 maxHeight: 350,
    //                 padding: 1,
    //               }}
    //             >
    //               {filteredSuggestionByInput?.map((suggestion, index) => {
    //                 return (
    //                   <Typography
    //                     onClick={() => {
    //                       let modifiedValue = textAreaInnerText.replace(
    //                         currentTargetWord + "\\",
    //                         `[${suggestion}]`
    //                       );
    //                       targetElement.value = modifiedValue;
    //                       setShowTagSuggestionsAnchorEl(null);
    //                     }}
    //                     variant="body2"
    //                     sx={{
    //                       backgroundColor: "#ffffff",
    //                       color: "#000",
    //                       padding: 2,
    //                       "&:hover": {
    //                         color: "white",
    //                         backgroundColor: "#1890ff",
    //                       },
    //                     }}
    //                   >
    //                     {suggestion}
    //                   </Typography>
    //                 );
    //               })}
    //             </Grid>
    //           );
    //           setShowTagSuggestionsAnchorEl(e.currentTarget);
    //           setTagSuggestionList(suggestionTagsContainer);
    //         }
    //       } else {
    //         setShowTagSuggestionsAnchorEl(false);
    //       }
    //     };
    //   }
    // }

    // Traversing and tab formatting --------------------------- end
  }, [labelConfig, userData, annotationNotesRef, reviewNotesRef, taskId]);

  useEffect(() => {
    showLoader();
  }, [taskId]);

  const autoSaveReview = () => {
    if (autoSave && lsfRef.current?.store?.annotationStore?.selected) {
      if (taskData?.annotation_status !== "freezed") {
        let annotation = lsfRef.current.store.annotationStore.selected;
        let temp = annotation.serializeAnnotation();
        for (let i = 0; i < temp.length; i++) {
          if (temp[i].value.text) {
            temp[i].value.text = [temp[i].value.text[0]];
          }
        }
        let review = annotations.filter(
          (annotation) => annotation.annotation_type === 2
        )[0];
        patchReview(
          review.id,
          load_time.current,
          review.lead_time,
          review.annotation_status,
          temp,
          review.parent_annotation,
          JSON.stringify(reviewNotesRef.current.getEditor().getContents()),
          true
        ).then((res) => {
          if (res.status !== 200) {
            setSnackbarInfo({
              open: true,
              message: "Error in autosaving annotation",
              variant: "error",
            });
          }
        });
      } else
        setSnackbarInfo({
          open: true,
          message: "Task is frozen",
          variant: "error",
        });
    }
  };

  let hidden, visibilityChange;
  if (typeof document.hidden !== 'undefined') {
    hidden = 'hidden';
    visibilityChange = 'visibilitychange';
  } else if (typeof document.msHidden !== 'undefined') {
    hidden = 'msHidden';
    visibilityChange = 'msvisibilitychange';
  } else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden';
    visibilityChange = 'webkitvisibilitychange';
  }

  const [visible, setVisibile] = useState(!document[hidden]);

  useEffect(() => {
    const handleVisibilityChange = () => setVisibile(!document[hidden]);
    document.addEventListener(visibilityChange, handleVisibilityChange);
    return () => {
      document.removeEventListener(visibilityChange, handleVisibilityChange);
    }
  }, []);

  useEffect(() => {
    !visible && autoSaveReview();
  }, [visible]);

  useEffect(() => {
    const interval = setInterval(() => {
      visible && autoSaveReview();
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [visible, autoSave, lsfRef.current?.store?.annotationStore?.selected, taskData]);

  const onNextAnnotation = async () => {
    showLoader();
    getNextProject(projectId, taskId, "review").then((res) => {
      hideLoader();
      // window.location.href = `/projects/${projectId}/task/${res.id}`;
      tasksComplete(res?.id || null);
    });
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReviseClick = async () => {
    review_status.current = "to_be_revised";
    lsfRef.current.store.submitAnnotation();
  };

  const handleAcceptClick = async (status) => {
    review_status.current = status;
    lsfRef.current.store.submitAnnotation();
    handleClose();
  };

  const renderSnackBar = () => {
    return (
      <CustomizedSnackbars
        open={snackbar.open}
        handleClose={() =>
          setSnackbarInfo({ open: false, message: "", variant: "" })
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        variant={snackbar.variant}
        message={snackbar.message}
        autoHideDuration={2000}
      />
    );
  };

  return (
    <div>
      {autoSave &&
        <div style={{ textAlign: "left", marginBottom: "15px" }}>
          <Typography variant="body" color="#000000">
            Auto-save enabled for this scenario.
          </Typography>
        </div>}
      {filterMessage && (
        <Alert severity="info" showIcon style={{ marginBottom: "1%" }}>
          {filterMessage}
        </Alert>
      )}
      {!loader && (
        <div
          style={{ display: "flex", justifyContent: "space-between" }}
          className="lsf-controls"
        >
          <div />
          <div>
            <Tooltip title="Go to next task">
              <Button
                type="default"
                onClick={onNextAnnotation}
                style={{
                  minWidth: "160px",
                  border: "1px solid #e6e6e6",
                  color: "#1890ff",
                  pt: 3,
                  pb: 3,
                  borderBottom: "None",
                }}
                className="lsf-button"
              >
                Next
              </Button>
            </Tooltip>
            {!disableBtns && taskData?.review_user === userData?.id && (
              <Tooltip title="Save task for later">
                <Button
                  type="default"
                  onClick={() => handleAcceptClick("draft")}
                  style={{
                    minWidth: "160px",
                    border: "1px solid #e6e6e6",
                    color: "#e80",
                    pt: 3,
                    pb: 3,
                    borderBottom: "None",
                  }}
                  className="lsf-button"
                >
                  Draft
                </Button>
              </Tooltip>
            )}
            {!disableBtns && !disableButton && taskData?.review_user === userData?.id && (
              <Tooltip title="Revise Annotation">
                <Button
                  value="to_be_revised"
                  type="default"
                  onClick={handleReviseClick}
                  style={{
                    minWidth: "160px",
                    border: "1px solid #e6e6e6",
                    color: "#f5222d",
                    pt: 3,
                    pb: 3,
                    borderBottom: "None",
                    borderLeft: "None",
                  }}
                  className="lsf-button"
                >
                  Revise
                </Button>
              </Tooltip>
            )}
            {!disableBtns && taskData?.review_user === userData?.id && (
              <Tooltip title="Accept Annotation">
                <Button
                  id="accept-button"
                  value="Accept"
                  type="default"
                  aria-controls={open ? "accept-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? "true" : undefined}
                  style={{
                    minWidth: "160px",
                    border: "1px solid #e6e6e6",
                    color: "#52c41a",
                    pt: 3,
                    pb: 3,
                    borderBottom: "None",
                    borderLeft: "None",
                  }}
                  className="lsf-button"
                  onClick={handleClick}
                  endIcon={<KeyboardArrowDownIcon />}
                >
                  Accept
                </Button>
              </Tooltip>
            )}
            <StyledMenu
              id="accept-menu"
              MenuListProps={{
                "aria-labelledby": "accept-button",
              }}
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
            >
              <MenuItem
                onClick={() => handleAcceptClick("accepted")}
                disableRipple
              >
                with No Changes
              </MenuItem>
              <MenuItem
                onClick={() => handleAcceptClick("accepted_with_minor_changes")}
                disableRipple
              >
                with Minor Changes
              </MenuItem>
              <MenuItem
                onClick={() => handleAcceptClick("accepted_with_major_changes")}
                disableRipple
              >
                with Major Changes
              </MenuItem>
            </StyledMenu>
          </div>
        </div>
      )}
      <Box sx={{ border: "1px solid rgb(224 224 224)" }}>
        <div className="label-studio-root" ref={rootRef}></div>
        <Popover
          id={"'simple-popover'"}
          open={Boolean(showTagSuggestionsAnchorEl)}
          anchorEl={showTagSuggestionsAnchorEl}
          onClose={() => {
            setShowTagSuggestionsAnchorEl(null);
            setTagSuggestionList(null);
          }}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          {tagSuggestionList}
        </Popover>
      </Box>
      {loader}
      {renderSnackBar()}
    </div>
  );
};

export default function LSF() {
  const [showNotes, setShowNotes] = useState(false);
  const [taskData, setTaskData] = useState([]);
  const [showGlossary, setShowGlossary] = useState(false);
  const annotationNotesRef = useRef(null);
  const reviewNotesRef = useRef(null);
  const superCheckerNotesRef = useRef(null);
  const [annotationtext,setannotationtext] = useState('')
  const [reviewtext,setreviewtext] = useState('')
  const [supercheckertext,setsupercheckertext] = useState('')
  const { taskId } = useParams();
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [alertData, setAlertData] = useState({
    open: false,
    message: "",
    variant: "info",
  });
  const { projectId } = useParams();

  const navigate = useNavigate();
  const [loader, showLoader, hideLoader] = useFullPageLoader();
  const ProjectDetails = useSelector((state) => state.getProjectDetails.data);
 
  const modules = {
    toolbar:[
      
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    ]
  };

  const formats = [
    'size',
    'bold','italic','underline','strike',
    'color',
    'script']

  const [value, setvalue] = useState();
  const handleTagChange = (event, value, reason) => {
    if (reason === "selectOption") {
      setSelectedTag(value);
      let copyValue = `[${value}]`;
      navigator.clipboard.writeText(copyValue);
      setAlertData({
        open: true,
        message: `Tag ${copyValue} copied to clipboard`,
        variant: "info",
      });
    }
  };
  


  useEffect(() => {
    if (
      ProjectDetails?.project_type &&
      (ProjectDetails?.project_type.toLowerCase().includes("audio") || ProjectDetails?.project_type?.includes("Acoustic"))
    ) {
      setShowTagsInput(true);
    }
  }, [ProjectDetails]);

  const handleCollapseClick = () => {
    setShowNotes(!showNotes);
  };


console.log(reviewtext,annotationtext);
  
  const resetNotes = () => {
    setShowNotes(false);
    reviewNotesRef.current.getEditor().setContents([]);
  };
  

  useEffect(() => {
    resetNotes();
  }, [taskId]);

  const getTaskData = (taskData) => {
    setTaskData(taskData);
  };
  const handleGlossaryClick = () => {
    setShowGlossary(!showGlossary);
  };

  return (
    <div style={{ maxHeight: "100%", maxWidth: "90%", margin: "auto" }}>
      {!loader && (
        <Button
          value="Back to Project"
          startIcon={<ArrowBackIcon />}
          variant="contained"
          color="primary"
          onClick={() => {
            localStorage.removeItem("labelAll");
            navigate(`/projects/${projectId}`);
            //window.location.replace(`/#/projects/${projectId}`);
            //window.location.reload();
          }}
        >
          Back to Project
        </Button>
      )}
      <Card
        sx={{
          minHeight: 500,
          padding: 5,
          mt: 3,
          pt: 3,
        }}
      >
        <div
          style={{
            display: "flow-root",
            marginBottom: "30px",
          }}
        >
          {!loader && (
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
              {annotationtext.trim().length === 0  &&
                supercheckertext.trim().length === 0 ? "" : "*"}
            </Button>
          )}
          <div
            className={styles.collapse}
            style={{
              display: showNotes ? "block" : "none",
              paddingBottom: "16px",
            }}
          >
            {/* <Alert severity="warning" showIcon style={{marginBottom: '1%'}}>
              {translate("alert.notes")}
          </Alert> */}
            {/* <TextField
              multiline
              placeholder="Place your remarks here ..."
              label="Annotation Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={annotationNotesRef}
              rows={2}
              maxRows={4}
              inputProps={{
                style: { fontSize: "1rem" },
                readOnly: true,
              }}
              style={{ width: "99%", marginTop: "1%" }}
            // ref={quillRef}
            /> */}
            {/* <TextField
              multiline
              // placeholder="Review Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={reviewNotesRef}
              rows={2}
              maxRows={4}
              inputProps={{
                style: { fontSize: "1rem" },
              }}
              style={{ width: "100%",fontSize:"1rem"}}
              ref={quillRef}
            /> */}
            <ReactQuill
              ref={annotationNotesRef}
              modules={modules}
              bounds={"#note"}
              formats={formats}
              placeholder="Annotation Notes"
              readOnly={true}
            ></ReactQuill>
            <ReactQuill
              ref={reviewNotesRef}
              modules={modules}
              bounds={"#note"}
              formats={formats}
              placeholder="Review Notes"
            ></ReactQuill>
            <ReactQuill
              ref={superCheckerNotesRef}
              modules={modules}
              bounds={"#note"}
              formats={formats}
              placeholder="SuperChecker Notes"
              readOnly={true}
            ></ReactQuill>
            {/* <TextField
              multiline
              placeholder="Place your remarks here ..."
              label="Super Checker Notes"
              // value={notesValue}
              // onChange={event=>setNotesValue(event.target.value)}
              inputRef={superCheckerNotesRef}
              rows={2}
              maxRows={4}
              inputProps={{
                style: { fontSize: "1rem" },
                readOnly: true,
              }}
              style={{ width: "99%", marginTop: "1%" }}
            // ref={quillRef}
            /> */}
          </div>
          <Button
            variant="contained"
            style={{ marginLeft: "10px" }}
            endIcon={showGlossary ? <ArrowRightIcon /> : <ArrowDropDownIcon />}
            onClick={handleGlossaryClick}
          >
            Glossary
          </Button>
          <div
            style={{
              display: showGlossary ? "block" : "none",
              paddingBottom: "16px",
              paddingTop: "10px",
            }}
          >
            <Glossary taskData={taskData} />
          </div>
          {showTagsInput && (
            <div
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Autocomplete
                id="demo"
                value={selectedTag}
                onChange={handleTagChange}
                options={TabsSuggestionData}
                size={"small"}
                getOptionLabel={(option) => option}
                sx={{
                  width: 200,
                  display: "inline-flex",
                  marginLeft: "10px",
                  marginRight: "10px",
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Noise Tag"
                    placeholder="Select Noise Tag"
                    style={{ fontSize: "14px" }}
                  />
                )}
                renderOption={(props, option, state) => {
                  return <MenuItem {...props}>{option}</MenuItem>;
                }}
              />
              <Tooltip
                title="Select the appropriate noise tag which can be linked to a selected audio region. Selecting the tag copies the value, which can be pasted in respective location of the transcription."
                placement="right"
              >
                <InfoIcon color="primary" />
              </Tooltip>
            </div>
          )}
        </div>
        <CustomizedSnackbars
          open={alertData.open}
          handleClose={() => setAlertData({ ...alertData, open: false })}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          variant={alertData.variant}
          message={alertData.message}
        />
        <LabelStudioWrapper
          getTaskData={getTaskData}
          resetNotes={() => resetNotes()}
          reviewNotesRef={reviewNotesRef}
          annotationNotesRef={annotationNotesRef}
          superCheckerNotesRef={superCheckerNotesRef}
          loader={loader}
          showLoader={showLoader}
          hideLoader={hideLoader}
          setannotationtext={setannotationtext}
          setreviewtext = {setreviewtext}
          setsupercheckertext={setsupercheckertext}
        />
      </Card>
    </div>
  );
}

LabelStudioWrapper.propTypes = PropTypes.object;
