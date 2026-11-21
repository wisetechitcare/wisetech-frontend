import React from "react";
import { DocumentEditor, type DocumentEditorProps } from "@modules/document-editor";
import { billDocumentProfile } from "./billDocumentProfile";

/** Proforma / Tax Invoice editor: the shared document editor with billing's profile. */
const BillDocumentEditorPage: React.FC<Omit<DocumentEditorProps, "profile">> = (props) => (
  <DocumentEditor profile={billDocumentProfile} {...props} />
);

export default BillDocumentEditorPage;
