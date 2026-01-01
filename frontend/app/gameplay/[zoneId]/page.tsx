import { ZONES } from '@/lib/gameplay/zones';
import { notFound } from 'next/navigation';
import GameplayContainer from '@/components/gameplay/GameplayContainer';

interface PageProps {
    params: Promise<{
        zoneId: string;
    }>;
}

export function generateStaticParams() {
    return Object.keys(ZONES).map((zoneId) => ({
        zoneId,
    }));
}

export default async function GameplayPage(props: PageProps) {
    const params = await props.params;
    const zone = ZONES[params.zoneId];

    if (!zone) {
        notFound();
    }

    // Delegate rendering to the Client Component
    return <GameplayContainer zone={zone} />;
}
