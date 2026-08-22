"use client";
import { WithReturn } from "../guard";
import { AIActivity } from "@/components/pages/AIActivity";

export default function Page() {
  return <WithReturn>{(ret) => <AIActivity ret={ret} />}</WithReturn>;
}
