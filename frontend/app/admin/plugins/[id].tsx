export default function PluginUIPage({ params }) {
  return (
    <iframe
      src={`http://localhost:4000/api/marketplace/ui/${params.id}`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none"
      }}
    />
  );
}
