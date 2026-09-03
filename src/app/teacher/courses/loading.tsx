export default function Loading(){
    return <div className="course-grid">{[1,2,3].map(i=><div className="panel empty" key={i}>กำลังโหลดรายวิชา...</div>)}
    </div>}
