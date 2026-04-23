import { createClient } from "@/lib/supabase/server";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(`*, users:assigned_to ( id, full_name )`)
    .order("due_date", { ascending: true });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name")
    .order("full_name");

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TasksClient initialTasks={(tasks ?? []) as any} contacts={contacts ?? []} />
  );
}
