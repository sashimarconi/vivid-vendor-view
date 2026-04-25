import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug } from "@/lib/supabase-queries";
import { trackEvent } from "@/hooks/usePageTracking";

const ThankYouRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const target = searchParams.get("to");
  const orderId = searchParams.get("order");

  const targetUrl = useMemo(() => {
    if (!target?.trim()) return null;

    try {
      const resolved = new URL(target.trim(), window.location.origin);
      return /^https?:$/i.test(resolved.protocol) ? resolved.toString() : null;
    } catch {
      return null;
    }
  }, [target]);

  const { data: product, isFetched } = useQuery({
    queryKey: ["thank-you-product", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!targetUrl) return;

    let redirected = false;

    const finishRedirect = () => {
      if (redirected) return;
      redirected = true;
      window.location.replace(targetUrl);
    };

    const fallbackTimer = window.setTimeout(finishRedirect, 1800);

    const registerAccessAndContinue = async () => {
      try {
        if (product?.user_id) {
          await trackEvent("thank_you_view", product.user_id, {
            order_id: orderId ?? null,
            product_slug: slug ?? null,
            target_url: targetUrl,
          });
        }
      } catch {
        // keep redirecting even if tracking fails
      } finally {
        window.clearTimeout(fallbackTimer);
        finishRedirect();
      }
    };

    if (isFetched) {
      registerAccessAndContinue();
    }

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [isFetched, orderId, product?.user_id, slug, targetUrl]);

  useEffect(() => {
    if (targetUrl) return;

    const fallbackUrl = slug ? `/checkout/${slug}` : "/";
    const timer = window.setTimeout(() => {
      window.location.replace(fallbackUrl);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [slug, targetUrl]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-md">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <h1 className="text-xl font-semibold">Redirecionando seu pedido</h1>
        <p className="text-sm text-muted-foreground">
          {targetUrl
            ? "Estamos liberando sua próxima etapa agora."
            : "Link de obrigado inválido. Voltando para o checkout..."}
        </p>
      </div>
    </main>
  );
};

export default ThankYouRedirect;