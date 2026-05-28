export function createAdminPayload(action, password, details = {}) {
  return {
    action,
    password,
    ...details,
  };
}

export function formatAdminCount(count) {
  return `${count}개 업로드`;
}

export async function invokeAdminAction(client, functionName, payload) {
  const { data, error } = await client.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
