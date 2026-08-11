import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";

import { EmptyState } from "@/components/common/Feedback";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { RequestCard } from "@/components/requests/RequestCard";
import { ProviderCard } from "@/components/directory/ProviderCard";
import { useSavedIds } from "@/features/saved/savedStore";
import { fetchPost } from "@/features/feed/feedApi";
import { fetchRequest } from "@/features/requests/requestsApi";
import { fetchProvider } from "@/features/directory/directoryApi";
import type { FeedPost, LocalRequest, ProviderProfile } from "@/types";

export function SavedPage() {
  const saved = useSavedIds();

  const postResults = useQueries({
    queries: saved.post.map((id) => ({
      queryKey: ["post", id],
      queryFn: () => fetchPost(id),
      staleTime: 60_000,
    })),
  });
  const requestResults = useQueries({
    queries: saved.request.map((id) => ({
      queryKey: ["request-detail", id],
      queryFn: () => fetchRequest(id),
      staleTime: 60_000,
    })),
  });
  const providerResults = useQueries({
    queries: saved.provider.map((id) => ({
      queryKey: ["provider", id],
      queryFn: () => fetchProvider(id),
      staleTime: 60_000,
    })),
  });

  const posts = postResults.filter((r) => r.isSuccess && r.data).map((r) => r.data as FeedPost);
  const requests = requestResults.filter((r) => r.isSuccess && r.data).map((r) => r.data as LocalRequest);
  const providers = providerResults.filter((r) => r.isSuccess && r.data).map((r) => r.data as ProviderProfile);
  const total = posts.length + requests.length + providers.length;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-headline-lg-mobile font-headline-lg-mobile md:text-headline-lg md:font-headline-lg text-on-background">
          Saved items
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Bookmarks live on this device — tap the bookmark icon on any post, request, or provider to keep it here.
        </p>
      </div>

      {total === 0 ? (
        <EmptyState
          icon="bookmark_border"
          title="Nothing saved yet"
          message="Tap the bookmark icon on anything you want to come back to — alerts, requests, or providers."
          action={
            <Link
              to="/nearby"
              className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full text-label-md font-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95"
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                explore
              </span>
              Browse Nearby
            </Link>
          }
        />
      ) : (
        <>
          {posts.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-label-md font-label-md text-on-background uppercase tracking-wider text-outline">
                Nearby alerts · {posts.length}
              </h2>
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </section>
          )}

          {requests.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-label-md font-label-md text-on-background uppercase tracking-wider text-outline">
                Requests · {requests.length}
              </h2>
              {requests.map((req) => (
                <RequestCard key={req.id} request={req} />
              ))}
            </section>
          )}

          {providers.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-label-md font-label-md text-on-background uppercase tracking-wider text-outline">
                Providers · {providers.length}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {providers.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
