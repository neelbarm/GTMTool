"use client";
import { WithReturn } from "../guard";
import { ReviewWorkspace } from "@/components/pages/ReviewWorkspace";

export default function Page() {
  return <WithReturn>{(ret) => <ReviewWorkspace ret={ret} />}</WithReturn>;
}
