import React from "react";
import { FormikProps } from "formik";

interface ProjectSectionsProps extends FormikProps<any> {
  projectType?: any;
  editingProjectId?: string | null;
  selectedProjectType?: string;
  intitalDataForLeadToProjectConversion?: any;
  statuses?: any[];
  countries?: any[];
  states?: any[];
  cities?: any[];
  // add any additional props needed
}

const ProjectSections: React.FC<ProjectSectionsProps> = (props) => {
  // Placeholder: render nothing or a simple message
  return <div>Project Sections Placeholder</div>;
};

export default ProjectSections;
