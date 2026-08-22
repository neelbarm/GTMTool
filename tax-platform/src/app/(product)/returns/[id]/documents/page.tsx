"use client";
import { WithReturn } from "../guard";
import { DocumentLibrary } from "@/components/pages/DocumentLibrary";

export default function Page() {
  return <WithReturn>{(ret) => <DocumentLibrary ret={ret} />}</WithReturn>;
}
