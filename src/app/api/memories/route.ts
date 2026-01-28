import { NextResponse } from "next/server";
import { getMemoryInstance, DEFAULT_USER_ID } from "@/lib/memory";

export async function GET() {
  try {
    const memory = getMemoryInstance();
    const results = await memory.getAll({ userId: DEFAULT_USER_ID });

    return NextResponse.json({
      success: true,
      memories: results.results || [],
      count: results.results?.length || 0,
    });
  } catch (error) {
    console.error("Get memories error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get memories",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { memoryId, deleteAll } = await req.json();
    const memory = getMemoryInstance();

    if (deleteAll) {
      // mem0ai supports deleteAll for vector store
      await memory.deleteAll({ userId: DEFAULT_USER_ID });

      // If graph is enabled, clear it too
      const memAny = memory as any;
      if (memAny.graphMemory && typeof memAny.graphMemory.deleteAll === 'function') {
        try {
          await memAny.graphMemory.deleteAll({ userId: DEFAULT_USER_ID });
        } catch (graphError) {
          console.error("Failed to delete graph memories:", graphError);
          // We continue because vector memories were already deleted
        }
      }

      return NextResponse.json({
        success: true,
        message: "All memories deleted successfully (including graph)",
      });
    }

    await memory.delete(memoryId);

    return NextResponse.json({
      success: true,
      message: `Memory ${memoryId} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete memory error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete memory",
      },
      { status: 500 }
    );
  }
}
