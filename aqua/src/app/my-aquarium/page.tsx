import { redirect } from "next/navigation";

// 내 어항은 "내 도감(키우는 중)" 페이지로 통합되었다.
// 예전 주소로 들어오는 경우를 위해 리다이렉트만 유지한다.
export default function MyAquariumPage() {
    redirect("/collection");
}
