// Simple test bulk delete endpoint
router.delete("/questions/bulk-delete-all-test", async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== "DELETE ALL QUESTIONS") {
      return res.status(400).json({
        message: "Confirmation required"
      });
    }
    
    return res.json({
      message: "Test endpoint working",
      confirmation: confirmation
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Test error",
      error: err.message
    });
  }
});
