I'd like to extend the parsing capabilties when a --groups param is passed

node src/index.js --data 2025-02  --groups u17/4,g16/3,g14/4,u14,/3,u12/3,u10/3,u8/3,u6/3

With the additional group info we know which groups to filter for. In the above example we know the groups are:

    u17/4 => 2008->2011 (i.e. 4 age groups with 2008 kids/u17 as the oldest)
    g16/3 => 2009->2011 (i.e. 3 age groups with 2009 kids/g16 as the oldest - g16 is girls-only)
    etc.

That should filter out all groups that are not in that list by default


x	Frida Lawrence (GK)	2011	x	u14	/				#	#	#	#
x	Julia Woroniecka	2011	x	u14	/				#	#	#	#
x	Riley Jacobs	2013		u12	@	#	#			#	#	#
x	Bartosz Woroniecki	2013		u12	@	#	#			#	#	#
x	Conor O'Shea	2016		u9	@	#	#	@	@		#	#
x	Maximos Garcia Pagiati	2018		u7	@	#	#	@	@	@		#
x	Ronan O'Shea	2018		u7	@	#	#	@	@	@		#
x	Fionn Perdisatt Liarte	2019		u6	@	#	#	@	@	@		
x	Saoirse Can	2020	x	u5	@	@	@	@	@	@	@	
x	Conor Nolan	2020		u5	@	#	#	@	@	@	@	
