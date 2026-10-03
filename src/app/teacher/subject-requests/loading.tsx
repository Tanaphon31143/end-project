export default function Loading() {
  return (
    <div
      className="subject-request-page"
      role="status"
      aria-label="กำลังโหลดคำขอรายวิชา"
    >
      <div
        className="skeleton"
        style={{ width: 240, height: 30, marginBottom: 13 }}
      />
      <div
        className="skeleton"
        style={{ width: "min(100%, 460px)", height: 16, marginBottom: 26 }}
      />
      <div className="subject-request-history">
        <div
          className="skeleton"
          style={{ width: 180, height: 22, marginBottom: 18 }}
        />
        {[0, 1, 2].map((item) => (
          <div
            className="skeleton"
            key={item}
            style={{
              width: "100%",
              height: 78,
              marginTop: 11,
              borderRadius: 11,
            }}
          />
        ))}
      </div>
      <span className="sr-only">กำลังโหลดคำขอรายวิชา</span>
    </div>
  );
}
