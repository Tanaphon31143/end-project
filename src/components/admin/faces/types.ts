export type FaceStatus="READY"|"NEEDS_IMAGES"|"INACTIVE";

export type FaceRecord={
  faceDataId:number;
  studentId:number;
  studentCode:string;
  studentName:string;
  className:string;
  photoCount:number;
  status:FaceStatus;
  registeredAt:string;
  updatedAt:string;
  sampleIds:number[];
};

export type FaceStudentOption={
  id:number;
  code:string;
  name:string;
  className:string;
  faceStatus:FaceStatus|null;
};

export type FaceSample={blob:Blob;preview:string;embedding:number[];quality:number};
