"use client";
import { WithReturn } from "./guard";
import { ReturnOverview } from "@/components/pages/ReturnOverview";

export default function Page() {
  return <WithReturn>{(ret) => <ReturnOverview ret={ret} />}</WithReturn>;
}
