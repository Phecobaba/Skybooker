import { useQuery } from "@tanstack/react-query";
import { PageContent } from "@shared/schema";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet";

export default function PageContentPage() {
  const { slug } = useParams();
  
  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ["/api/page-contents/slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/page-contents/${slug}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch page content for slug: ${slug}`);
      }
      return response.json() as Promise<PageContent>;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !pageContent) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageContent.title} | SkyBooker</title>
        <meta name="description" content={`${pageContent.title} - SkyBooker flight booking platform`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8 text-center">{pageContent.title}</h1>
        
        <div className="max-w-3xl mx-auto prose prose-lg">
          <div dangerouslySetInnerHTML={{ __html: pageContent.content }} />
        </div>
      </div>
    </>
  );
}