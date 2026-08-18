import { InfoPage } from "@/components/info/InfoPage";
import { StarIcon } from "@/components/icons/Icons";

export const metadata = { title: "Success Stories | MyDealBuddy" };

const STORIES = [
  { name: "Jasmine R.", location: "Austin, TX", quote: "Saved almost $200 on back-to-school shopping using MyDealBuddy's deal alerts. The Buddy Coins made round two even cheaper." },
  { name: "Devon P.", location: "Toronto, ON", quote: "I referred three friends and the coins covered my entire next order. Genuinely didn't expect that." },
  { name: "Lena M.", location: "Manchester, UK", quote: "The verified coupons actually work, which sounds like a low bar but it isn't, in my experience with other sites." },
];

export default function SuccessStoriesPage() {
  return (
    <InfoPage title="Success Stories" wide>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STORIES.map((story) => (
          <div key={story.name} className="rounded-md border border-border p-5">
            <div className="flex text-rating">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className="h-4 w-4" />
              ))}
            </div>
            <p className="mt-3 text-sm italic text-text-secondary">&ldquo;{story.quote}&rdquo;</p>
            <p className="mt-4 text-sm font-semibold text-text-primary">{story.name}</p>
            <p className="text-xs text-text-muted">{story.location}</p>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
