/** En el navegador, las posiciones las manda el simulador de GPS en vez de iOS. */
import { subscribeLocations } from '@/simulator/simulator';
import { handleLocationBatch } from '@/tracking/recorder';

subscribeLocations((locations) => {
  void handleLocationBatch(locations);
});
