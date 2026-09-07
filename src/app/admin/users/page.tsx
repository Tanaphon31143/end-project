import UsersManager from "@/components/admin/users/UsersManager";
import { getUsers } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const users = await getUsers();
  return <UsersManager initialUsers={users}/>;
}
