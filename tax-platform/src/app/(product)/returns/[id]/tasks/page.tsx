"use client";
import { WithReturn } from "../guard";
import { ReturnTasks } from "@/components/pages/Work";

export default function Page() {
  return <WithReturn>{(ret) => <ReturnTasks ret={ret} />}</WithReturn>;
}
