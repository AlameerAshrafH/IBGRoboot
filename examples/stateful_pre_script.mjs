export default async function statefulPreScript({ headers, data }) {
    console.log("[Stateful Pre-suite-script] Running...");
  
    const token = "ABC123TOKEN";
  
    const updatedHeaders = {
      headers: [...headers],
      Authorization: `Bearer ${token}`,
    };
  
    const globalData = {
      userId: 999,
      isDefault: true,
      ...data,
    };
  
    return {
      headers: updatedHeaders,
      data: globalData,
    };
  }