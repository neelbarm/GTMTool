"use client";
import { WithReturn } from "../guard";
import { ReturnActivity } from "@/components/pages/Work";

export default function Page() {
  return <WithReturn>{(ret) => <ReturnActivity ret={ret} />}</WithReturn>;
}
