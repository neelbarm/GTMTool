"use client";
import { WithReturn } from "../guard";
import { Questionnaire } from "@/components/pages/Questionnaire";

export default function Page() {
  return <WithReturn>{(ret) => <Questionnaire ret={ret} />}</WithReturn>;
}
