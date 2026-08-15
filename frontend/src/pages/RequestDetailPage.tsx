import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { Tag } from "@/components/common/Chip";
import { DistanceChip } from "@/components/common/DistanceChip";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { ReportButton } from "@/components/common/ReportButton";
import { Textarea } from "@/components/common/Form";
import { requestTypeMeta } from "@/features/requests/requestsConfig";
import { useCreateReply, useFulfillRequest, useRequest } from "@/features/requests/requestsHooks";
import { reportRequest } from "@/features/requests/requestsApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { timeAgo, timeUntil } from "@/lib/geo";

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const composerRef = useRef<HTMLDivElement>(null);
  const request = useRequest(id);
  const createReply = useCreateReply(id);
  const fulfill = useFulfillRequest(id);

  if (request.isLoading) return <LoadingState label="Loading request…" />;
  if (request.isError || !request.data) {
    return <ErrorState message={request.error?.message ?? "Request not found."} onRetry={() => request.refetch()} />;
  }

  const req = request.data;
  const meta = requestTypeMeta(req.type);
  const isAuthor = user?.id === req.user_id;
  const open = req.status === "open" && req.needed_by > new Date().toISOString();
  const deadline = timeUntil(req.needed_by);

  const sendReply = async () => {
    if (message.trim().length === 0) return;
    await createReply.mutateAsync(message.trim());
    setMessage("");
  };

  const scrollToComposer = () => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link to="/needs" className="inline-flex items-center gap-1.5 text-label-md font-label-md text-primary hover:underline">
        <span aria-hidden className="material-symbols-outlined text-[18px]">
          arrow_back
        </span>
        Back to requests
      </Link>

      {/* Post header (screen 04) */}
      <section className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={req.author_name} size="lg" />
            <div>
              <h2 className="text-label-md font-label-md text-on-background flex items-center gap-2">
                {req.author_name}
                {req.status === "fulfilled" && (
                  <span aria-hidden className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL'1" }}>
                    verified
                  </span>
                )}
              </h2>
              <p className="text-label-sm font-label-sm text-on-surface-variant">{timeAgo(req.created_at)}</p>
            </div>
          </div>
          <span className={cn("px-2 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1", meta.tagClass)}>
            <span aria-hidden className="material-symbols-outlined text-sm">
              {meta.icon}
            </span>
            {meta.label}
          </span>
          {!isAuthor && open && (
            <button
              onClick={() => navigate(`/messages?user=${req.user_id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-md font-label-md bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                chat_bubble
              </span>
              Message
            </button>
          )}
          <ReportButton submitReport={(reason) => reportRequest(req.id, reason)} />
        </div>
        <div>
          <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-background">
            {req.text}
          </h1>
          <div className="flex gap-2 flex-wrap mt-3">
            <DistanceChip distanceM={req.distance_m} />
            {open && deadline && (
              <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-high rounded-lg px-2 py-1">
                <span aria-hidden className="material-symbols-outlined text-[15px] text-tertiary">
                  schedule
                </span>
                need by {deadline}
              </span>
            )}
            {!open && <Tag icon={req.status === "fulfilled" ? "check_circle" : "cancel"} label={req.status === "fulfilled" ? "Fulfilled" : "Expired"} tone="tertiary" />}
          </div>
        </div>
      </section>

      {/* Map snippet (screen 04) — grounded, native-feeling placeholder */}
      <section className="rounded-xl overflow-hidden shadow-sm border border-outline-variant relative">
        <div className="w-full h-40 md:h-52 bg-surface-container-high" style={{
          backgroundImage:
            "linear-gradient(rgba(194,200,191,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(194,200,191,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}>
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-tertiary">
              <span aria-hidden className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL'1" }}>
                location_on
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">{req.author_name.split("")[0]}'s spot</span> </div> </div> </div> <div className="absolute bottom-2 left-2 bg-surface/95 px-3 py-2 rounded-lg border border-outline-variant flex items-center gap-2 shadow-sm"> <span aria-hidden className="material-symbols-outlined text-tertiary text-[18px]"style={{ fontVariationSettings:"'FILL' 1"}}> directions_walk </span> <span className="text-label-sm font-label-sm text-on-surface">{req.distance_m !== null && req.distance_m !== undefined && req.distance_m < 1000 ?"Walking distance":"Nearby"} from you</span> </div> </section> {/* Responses (screen 04) */} <section className="space-y-5"> <h2 className="text-label-md font-label-md text-on-background border-b border-outline-variant pb-2"> Responses ({req.replies.length}) </h2> {req.replies.length === 0 ? ( <EmptyState icon="forum"title="No responses yet"message="Be the neighbor who helps — reply below."/> ) : ( <div className="space-y-3"> {req.replies.map((r) => ( <div key={r.id} className="flex gap-3"> <Avatar name={r.author_name} size="sm"/> <div className="bg-surface-container rounded-2xl rounded-tl-none p-3 flex-1 shadow-sm border border-surface-variant"> <div className="flex justify-between items-start mb-base"> <h4 className="text-label-md font-label-md text-on-background">{r.author_name}</h4> <span className="text-label-sm font-label-sm text-on-surface-variant">{timeAgo(r.created_at)}</span> </div> <p className="text-body-md font-body-md text-on-surface">{r.message}</p> </div> </div> ))} </div> )} </section> {/* Reply composer */} {open ? ( <section ref={composerRef} className="bg-surface-container-low rounded-xl p-5 border border-outline-variant space-y-3"> <label className="text-label-md font-label-md text-on-background"htmlFor="reply"> {isAuthor ?"Update your request":"Offer to help"} </label> <Textarea id="reply"rows={3} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} placeholder={isAuthor ?"Any updates for neighbors?":"e.g. I have a ladder you can borrow — I'm on Carter Road…"}
          />
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={sendReply}
              disabled={message.trim().length === 0 || createReply.isPending}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                send
              </span>
              {isAuthor ? "Post update" : "Send reply"}
            </button>
            {isAuthor && (
              <button
                onClick={() => fulfill.mutate()}
                disabled={fulfill.isPending}
                className="inline-flex items-center gap-2 bg-surface-container-high border border-outline text-on-surface px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-surface-variant transition-colors active:scale-95"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                Mark fulfilled
              </button>
            )}
          </div>
        </section>
      ) : (
        <p className="text-label-sm font-label-sm text-on-surface-variant text-center py-3">
          This request is closed — thanks to everyone who helped.
        </p>
      )}

      {/* Desktop floating CTA (screen 04) */}
      {open && (
        <div className="hidden md:block fixed bottom-8 right-8 z-40">
          <button
            onClick={scrollToComposer}
            className="bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3 px-8 rounded-full transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"
          >
            <span aria-hidden className="material-symbols-outlined text-[20px]">
              {meta.icon}
            </span>
            I can help
          </button>
        </div>
      )}
    </div>
  );
}
