// UTILITY FUNCTIONS

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "healthy":
      return "text-green-700 bg-green-100";
    case "moderately healthy":
      return "text-yellow-700 bg-yellow-100";
    case "poor":
      return "text-orange-700 bg-orange-100";
    case "very poor":
      return "text-red-700 bg-red-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
};
