"use client";
import { useParams } from "next/navigation";
import { Inbox } from "@/components/pages/Inbox";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <Inbox threadId={id} />;
}
