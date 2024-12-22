// // src/app/api/init/route.ts
// import { NextResponse } from "next/server";
// //@tg-ignore
// import { runWorkers } from "@/server/worker";

// let isInitialized = false;

// export async function GET() {
//   if (!isInitialized) {
//     try {
//       await runWorkers();
//       isInitialized = true;
//       return NextResponse.json({
//         status: "success",
//         message: "Background workers started",
//       });
//     } catch (error) {
//       console.error("Failed to start background workers:", error);
//       return NextResponse.json(
//         { status: "error", message: "Failed to start background workers" },
//         { status: 500 },
//       );
//     }
//   }
//   return NextResponse.json({
//     status: "success",
//     message: "Already initialized",
//   });
// }
