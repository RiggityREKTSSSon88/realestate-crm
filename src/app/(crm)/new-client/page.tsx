import NewClientForm from "./NewClientForm";

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--color-navy-800)",
            marginBottom: "4px",
          }}
        >
          New Client
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-slate-500)" }}>
          Create a contact and property in one step
        </p>
      </div>
      <NewClientForm />
    </div>
  );
}
