import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { overviewDemoCopy, overviewDemoRecentSales } from '@/locales/vi/overview-dashboard';

export function RecentSales() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>{overviewDemoCopy.recentSales.title}</CardTitle>
        <CardDescription>{overviewDemoCopy.recentSales.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-8'>
          {overviewDemoRecentSales.map((sale, index) => (
            <div key={index} className='flex items-center'>
              <Avatar className='h-9 w-9'>
                <AvatarImage src={sale.avatar} alt={overviewDemoCopy.recentSales.avatarAlt} />
                <AvatarFallback>{sale.fallback}</AvatarFallback>
              </Avatar>
              <div className='ml-4 space-y-1'>
                <p className='text-sm leading-none font-medium'>{sale.name}</p>
                <p className='text-muted-foreground text-sm'>{sale.email}</p>
              </div>
              <div className='ml-auto font-medium'>{sale.amount}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
