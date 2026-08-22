"use client";

import { WithReturn } from "@/app/(product)/returns/[id]/guard";
import { AIActivity } from "@/components/pages/AIActivity";
import { DocumentLibrary } from "@/components/pages/DocumentLibrary";
import { Inbox } from "@/components/pages/Inbox";
import { Questionnaire } from "@/components/pages/Questionnaire";
import { ReturnOverview } from "@/components/pages/ReturnOverview";
import { ReturnActivity, ReturnTasks } from "@/components/pages/Work";
import { ReviewWorkspace } from "@/components/pages/ReviewWorkspace";
import { useParams } from "next/navigation";

/* ============================================================================
   Client halves of the dynamic routes.

   The route files themselves are server components so they can export
   `generateStaticParams`, which is what lets the whole product pre-render to
   static HTML for GitHub Pages. Everything below the boundary is unchanged —
   the product is client-rendered either way.
   ========================================================================== */

export function ReturnOverviewRoute() {
  return <WithReturn>{(ret) => <ReturnOverview ret={ret} />}</WithReturn>;
}

export function ReviewRoute() {
  return <WithReturn>{(ret) => <ReviewWorkspace ret={ret} />}</WithReturn>;
}

export function DocumentsRoute() {
  return <WithReturn>{(ret) => <DocumentLibrary ret={ret} />}</WithReturn>;
}

export function QuestionsRoute() {
  return <WithReturn>{(ret) => <Questionnaire ret={ret} />}</WithReturn>;
}

export function AIRoute() {
  return <WithReturn>{(ret) => <AIActivity ret={ret} />}</WithReturn>;
}

export function TasksRoute() {
  return <WithReturn>{(ret) => <ReturnTasks ret={ret} />}</WithReturn>;
}

export function ActivityRoute() {
  return <WithReturn>{(ret) => <ReturnActivity ret={ret} />}</WithReturn>;
}

export function ThreadRoute() {
  const { id } = useParams<{ id: string }>();
  return <Inbox threadId={id} />;
}
