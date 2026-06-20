export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Edit Task: {id}</h1>
    </div>
  );
}
