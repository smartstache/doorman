import React from "react";
import {Card, CardActionArea, CardContent, Grid} from "@mui/material";

export default function CandyMachineConfigInfo({ itemsAvailable, itemsRedeemed, itemsRemaining }) {

   return (
      <Card sx={{ maxWidth: 612}}>
         <CardActionArea>
            <CardContent>
               <Grid container spacing={2}>
                  <Grid item xs={3}>
                     Start Date
                  </Grid>
                  <Grid item xs={9}>
                     {/*{startDate}*/}
                  </Grid>
                  <Grid item xs={3}>
                     Items Available
                  </Grid>
                  <Grid item xs={9}>
                     {itemsAvailable}
                  </Grid>
                  <Grid item xs={3}>
                     Redeemed:
                  </Grid>
                  <Grid item xs={9}>
                     {itemsRedeemed}
                  </Grid>
                  <Grid item xs={3}>
                     Remaining:
                  </Grid>
                  <Grid item xs={9}>
                     {itemsRemaining}
                  </Grid>
               </Grid>
            </CardContent>
         </CardActionArea>
      </Card>
   );
}
