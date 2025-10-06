import Authservices from '../services/authservices';
import { request,response} from 'express';

class authcontroller{
    static signup=async(req,res)=>{
        try{
       const{username,email,password}=req.body;
       if(!email||!password||!username)
        return res.status(400).json({message:'Missing Email or password or username',error})
         const normalizedEmail = String(email).trim().toLowerCase();

       const existinguser= await Authservices.findUserByEmail(normalizedEmail)
       if(registereduser)
        return res.status(400).json({message:'Already Registered',error})
        }catch(err){
            res.status(400).json({message:'signup failed',error})
        }
    }
}