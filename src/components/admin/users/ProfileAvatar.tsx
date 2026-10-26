"use client";
import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({reference,name,hasImage,className=""}:{reference:string;name:string;hasImage?:number|boolean;className?:string}) {
  const [failed,setFailed]=useState(false);
  return <span className={`um-profile-avatar ${className}`} aria-hidden="true">{name.trim().slice(0,2)}{hasImage&&!failed?<Image src={`/api/admin/profile-image?ref=${encodeURIComponent(reference)}`} width={42} height={42} alt="" unoptimized loading="lazy" onError={()=>setFailed(true)}/>:null}</span>;
}
